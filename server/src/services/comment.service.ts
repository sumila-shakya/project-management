import { db } from "../config/mysql.config";
import { comments, projects, tasks, teamMembers, NewComment } from "../models/mysql.model";
import { AnalyticsLog } from "../models/mongodb.model";
import { ApiError } from "../utils/apiError";
import { commentContentType } from "../utils/validator";
import { eq, and, desc } from "drizzle-orm";

export const commentServices = {
    async addComment(authorId: number, taskId: number, data: commentContentType) {
        // get the existing task
        const [existingTask] = await db
        .select({
            taskId: tasks.taskId,
            projectId: tasks.projectId,
            projectStatus: projects.projectStatus,
            role: teamMembers.role
        })
        .from(tasks)
        .innerJoin(projects, eq(tasks.projectId, projects.projectId))
        .innerJoin(teamMembers, eq(projects.teamId, teamMembers.teamId))
        .where(and(
            eq(tasks.taskId, taskId),
            eq(teamMembers.userId, authorId)
        ))
        
        // if task data does not exists throw error
        if(!existingTask) {
            throw new ApiError(403, "Access Denied")
        }
        
        // throw error if the project was archived
        if(existingTask.projectStatus === 'archived') {
            throw new ApiError(400, "Cannot comment on task on a archived projects")
        }

        const newComment: NewComment = {
            authorId: authorId,
            taskId: taskId,
            content: data.content
        }

        const [result] = await db
        .insert(comments)
        .values(newComment)

        if(result) {
            await AnalyticsLog.create({
                taskId: taskId,
                userId: authorId,
                action: 'commented',
                timestamp: new Date()
            })
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
        
        // throw error if the project was archived
        if(existingTask.projectStatus === 'archived' && existingTask.userRole === 'member') {
            throw new ApiError(403, "Access Denied")
        }

        const commentsOnTask = await db
        .select()
        .from(comments)
        .where(eq(comments.taskId, taskId))
        .orderBy(desc(comments.createdAt))

        return commentsOnTask
    }
}