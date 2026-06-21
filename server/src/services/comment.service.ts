import { db } from "../config/mysql.config";
import { comments, projects, tasks, teamMembers, NewComment, teams, users, Comment } from "../models/mysql.model";
import { AnalyticsLog } from "../models/mongodb.model";
import { ApiError } from "../utils/apiError";
import { commentContentType } from "../validator/comment.validator";
import { cursorPaginationType } from "../validator/global.validator";
import { eq, and, desc, asc, or, gt, lt } from "drizzle-orm";
import { IAnalyticsLog, CommentCursor, CursorPageMetaData } from "../@types/interface";
import { taskGuard } from "./task.service";
import { encodeCommentCursor, decodeCommentCursor } from "../utils/cursor";
import { DEFAULT_PAGE_LIMIT } from "../utils/constants";

export const commentServices = {
    async addComment(authorId: number, taskId: number, data: commentContentType) {
        const existingTask = await taskGuard.validateAccess(authorId, taskId)

        const newComment: NewComment = {
            authorId: authorId,
            taskId: taskId,
            content: data.content
        }

        // inser the new comment into the database
        const [result] = await db
        .insert(comments)
        .values(newComment)

        const contentLength: number = data.content.length
        const previewLength: number = contentLength <= 50 ? contentLength : 50

        // write into the log
        if(result) {
            const log: IAnalyticsLog = {
                actor: {
                    userId: String(authorId),
                    userName: existingTask.userName,
                    role: existingTask.role
                },
                target: {
                    taskId: String(taskId),
                    taskName: existingTask.title
                },
                action: 'commented',
                changes: [{
                    field: 'comment',
                    oldValue: null,
                    newValue: {
                        commentId: String(result.insertId),
                        commentPreview: `${data.content.substring(0, previewLength)}...`
                    }
                }],
                team: {
                    teamId: String(existingTask.teamId),
                    teamName: existingTask.teamName
                },
                project: {
                    projectId: String(existingTask.projectId),
                    projectName: existingTask.projectName
                },
                timestamp: new Date()
            }

            await AnalyticsLog.create(log)
        }

        return {
            commentId: result.insertId,
            authorId: authorId,
            taskId: taskId,
            content: data.content
        }
    },

    async getComments(userId: number, taskId: number, paginationData: cursorPaginationType) {
        // get the page limit
        const limit: number = paginationData.limit || DEFAULT_PAGE_LIMIT

        // get the existing task
        const [existingTask] = await db
        .select({
            taskId: tasks.taskId,
            projectId: tasks.projectId,
            projectStatus: projects.projectStatus,
            userRole: teamMembers.role
        })
        .from(tasks)
        .innerJoin(projects, eq(tasks.projectId, projects.projectId))
        .innerJoin(teamMembers, eq(projects.teamId, teamMembers.teamId))
        .where(and(
            eq(tasks.taskId, taskId),
            eq(teamMembers.userId, userId)
        ))
        
        // if task data does not exists throw error
        if(!existingTask) {
            throw new ApiError(403, "Access Denied")
        }

        const queryfilters = []

        // get the comments of the task id mentioned
        queryfilters.push(eq(comments.taskId, taskId))

        // if cursor exists query according to the cursor
        if(paginationData.cursor) {
            // decode the cursor
            const cursor: CommentCursor = decodeCommentCursor(paginationData.cursor)

            queryfilters.push(or(
                lt(comments.createdAt, cursor.createdAt),
                and(
                    eq(comments.createdAt, cursor.createdAt),
                    gt(comments.commentId, cursor.commentId)
                )
            ))
        }

        // get the comments
        const commentsOnTask: Comment[] = await db
        .select()
        .from(comments)
        .where(and(...queryfilters))
        .orderBy(
            desc(comments.createdAt), 
            asc(comments.commentId)
        )
        .limit(limit + 1)

        // initializa the pagination meta data
        const pageMetaData: CursorPageMetaData = {
            nextPage: false,
            limit: limit
        }

        // if next page exists generate new cursor
        if(commentsOnTask.length > limit) {
            // generate the new cursor data from the last comment
            const nextCursorData: CommentCursor = {
                createdAt: commentsOnTask[limit-1].createdAt!, 
                commentId: commentsOnTask[limit-1].commentId
            }

            // encode the cursor data
            const nextCursor: string = encodeCommentCursor(nextCursorData)

            // update the pagination meta data
            pageMetaData.nextPage = true
            pageMetaData.nextCursor = nextCursor
        }
        
        // if next page exists only show the current page comments
        const currentPageData: Comment[] = pageMetaData.nextPage 
        ? commentsOnTask.slice(0, limit) 
        : commentsOnTask

        return {
            pageMetaData,
            currentPageData
        }
    },

    async editComment(authorId: number, commentId: number, updates: commentContentType) {
        // get the comment where the user is the author
        const [existingComment] = await db
        .select({
            commentId: comments.commentId,
            projectStatus: projects.projectStatus
        })
        .from(comments)
        .innerJoin(tasks, eq(comments.taskId, tasks.taskId))
        .innerJoin(projects, eq(tasks.projectId, projects.projectId))
        .where(and(
            eq(comments.commentId, commentId),
            eq(comments.authorId, authorId)
        ))

        // throw error if the comment is not found
        if(!existingComment) {
            throw new ApiError(403, "Access Denied")
        }

        // throw error if the project was archived
        if(existingComment.projectStatus === 'archived') {
            throw new ApiError(403, "Cannot edit comment on archived projects")
        }

        // update the database
        const [result] = await db
        .update(comments)
        .set({
            content: updates.content,
            isEdited: true
        })
        .where(eq(comments.commentId, commentId))

        // throw error if no row was updated
        if(result.affectedRows === 0) {
            throw new ApiError(400, "No changes applied")
        }

        // get the edited comment
        const editedComment = await db
        .select()
        .from(comments)
        .where(eq(comments.commentId, commentId)) 

        return editedComment
    },

    async deleteComment(userId: number, commentId: number) {
        // get the comment
        const [existingComment] = await db
        .select({
            commentId: comments.commentId,
            content: comments.content,
            authorId: comments.authorId,
            taskId: tasks.taskId,
            taskName: tasks.title,
            projectId: projects.projectId,
            projectName: projects.projectName,
            projectStatus: projects.projectStatus,
            teamId: teams.teamId,
            teamName: teams.teamName,
            userName: users.name,
            role: teamMembers.role
        })
        .from(comments)
        .innerJoin(tasks, eq(comments.taskId, tasks.taskId))
        .innerJoin(projects, eq(tasks.projectId, projects.projectId))
        .innerJoin(teams, eq(projects.teamId, teams.teamId))
        .innerJoin(teamMembers, eq(teams.teamId, teamMembers.teamId))
        .innerJoin(users, eq(teamMembers.userId, users.userId))
        .where(and(
            eq(comments.commentId, commentId),
            eq(teamMembers.userId, userId)
        ))

        // throw error if the comment is not found
        if(!existingComment) {
            throw new ApiError(403, "Access Denied")
        }

        // throw error if the user is not the admin or the author
        if(existingComment.role !== 'admin' && existingComment.authorId !== userId) {
            throw new ApiError(403, "Access Denied")
        }

        // throw error if the author or admin is trying to delete the comment on a archived project
        if(existingComment.projectStatus === 'archived') {
            throw new ApiError(403, "Access Denied")
        }

        const contentLength: number = existingComment.content.length
        const previewLength: number = contentLength <= 50 ? contentLength : 50

        const log: IAnalyticsLog = {
            actor: {
                userId: String(userId),
                userName: existingComment.userName,
                role: existingComment.role
            },
            target: {
                taskId: String(existingComment.taskId),
                taskName: existingComment.taskName
            },
            action: 'comment_deleted',
            changes: [{
                field: 'comment',
                oldValue: {
                    commentId: String(commentId),
                    commentPreview: `${existingComment.content.substring(0, previewLength)}...`
                },
                newValue: null
            }],
            team: {
                teamId: String(existingComment.teamId),
                teamName: existingComment.teamName
            },
            project: {
                projectId: String(existingComment.projectId),
                projectName: existingComment.projectName
            },
            timestamp: new Date()
        }

        // delete the comment
        await db
        .delete(comments)
        .where(eq(comments.commentId, commentId))

        await AnalyticsLog.create(log)
    }
}