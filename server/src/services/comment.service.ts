import { db } from "../config/mysql.config";
import { comments, projects, tasks, teamMembers, NewComment, teams, users } from "../models/mysql.model";
import { AnalyticsLog } from "../models/mongodb.model";
import { ApiError } from "../utils/apiError";
import { commentContentType } from "../utils/validator";
import { eq, and, desc } from "drizzle-orm";
import { IAnalyticsLog } from "../@types/interface";
import { taskGuard } from "./task.service";

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

    async getComments(userId: number, taskId: number) {
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
        
        // if the user is only the member do not allow to see the comments on task of archived projects
        if(existingTask.projectStatus === 'archived' && existingTask.userRole === 'member') {
            throw new ApiError(403, "Access Denied")
        }

        // get the comments
        const commentsOnTask = await db
        .select()
        .from(comments)
        .where(eq(comments.taskId, taskId))
        .orderBy(desc(comments.createdAt))

        return commentsOnTask
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
            authorId: comments.authorId,
            projectStatus: projects.projectStatus,
            role: teamMembers.role
        })
        .from(comments)
        .innerJoin(tasks, eq(comments.taskId, tasks.taskId))
        .innerJoin(projects, eq(tasks.projectId, projects.projectId))
        .innerJoin(teamMembers, eq(projects.teamId, teamMembers.teamId))
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

        // throw error if the author is trying to delete the comment on a archived project
        if(existingComment.authorId === userId && existingComment.projectStatus === 'archived') {
            throw new ApiError(403, "Access Denied")
        }

        // delete the comment
        await db
        .delete(comments)
        .where(eq(comments.commentId, commentId))
    }
}