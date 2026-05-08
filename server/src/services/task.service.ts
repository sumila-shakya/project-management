import { db } from "../config/mysql.config";
import { tasks, taskAssets, projects, teamMembers, NewTask, teams } from "../models/mysql.model";
import { ApiError } from "../utils/apiError";
import { eq, and, asc } from "drizzle-orm";
import { taskType, filterProjectsTaskType, updateTaskType, processTaskType, assignTaskType } from "../utils/validator";
import { helper } from "./project.service";
import { statusTransition } from "../utils/statusTransition";
import { Role } from "../@types/interface";

export const taskServices = {
    async createTask(userId: number, projectId: number, data: taskType) {
        // check if the project exists
        const {existingProject, membership} = await helper.projectAccess(userId, projectId)

        if(existingProject.projectStatus === 'archived') {
            throw new ApiError(400, "Cannot add task to archived projects")
        }

        const newTask: NewTask = {
            createdBy: userId,
            projectId: projectId,
            ...data
        }

        const [result] = await db
        .insert(tasks)
        .values(newTask)

        const [insertedTask] = await db
        .select()
        .from(projects)
        .where(eq(projects.projectId, result.insertId))

        return insertedTask
    },

    async getTaskDetails(userId: number, taskId: number) {
        // check if the user belongs to team task is of
        const [taskDetails] = await db
        .select({
            taskId: tasks.taskId,
            title: tasks.title,
            description: tasks.description,
            projectId: tasks.projectId,
            projectName: projects.projectName,
            teamId: teams.teamId,
            teamName: teams.teamName,
            createdBy: tasks.createdBy,
            assignedTo: tasks.assignedTo,
            parentTaskId: tasks.parentTaskId,
            taskStatus: tasks.taskStatus,
            taskPriority: tasks.taskPriority,
            dueDate: tasks.dueDate,
            createdAt: tasks.createdAt,
            updatedAt: tasks.updatedAt,
            completedAt: tasks.completedAt
        })
        .from(tasks)
        .innerJoin(projects, eq(tasks.projectId, projects.projectId))
        .innerJoin(teams, eq(projects.teamId, teams.teamId))
        .where(eq(tasks.taskId, taskId))

        if(!taskDetails) {
            throw new ApiError(404, "Task not found")
        }

        const {existingProject, membership} = await helper.projectAccess(userId, taskDetails.projectId)

        if(existingProject.projectStatus === 'archived' && membership.role === 'member') {
            throw new ApiError(403, "Access denied")
        }

        return taskDetails
    },

    async getTasksInProjects(userId: number, projectId: number, queryFilters: filterProjectsTaskType) {
        // check if the project exists
        const {existingProject, membership} = await helper.projectAccess(userId, projectId)

        if(existingProject.projectStatus === 'archived' && membership.role === 'member') {
            throw new ApiError(403, "Access Denied")
        }

        const filters = [eq(tasks.projectId, existingProject.projectId)]

        if(queryFilters.taskPriority) {
            filters.push(eq(tasks.taskPriority, queryFilters.taskPriority))
        }

        if(queryFilters.taskStatus) {
            filters.push(eq(tasks.taskStatus, queryFilters.taskStatus))
        }

        const allTasks = await db
        .select()
        .from(tasks)
        .where(and(...filters))
        .orderBy(asc(tasks.dueDate))

        return allTasks
    },

    async getTasks(userId: number, queryFilters: filterProjectsTaskType) {
        const filters = [eq(tasks.assignedTo, userId)]
        filters.push(eq(projects.projectStatus, 'active'))

        if(queryFilters.taskPriority) {
            filters.push(eq(tasks.taskPriority, queryFilters.taskPriority))
        }

        if(queryFilters.taskStatus) {
            filters.push(eq(tasks.taskStatus, queryFilters.taskStatus))
        }

        const [userTasks] = await db
        .select({
            taskId: tasks.taskId,
            title: tasks.title,
            description: tasks.description,
            projectId: tasks.projectId,
            projectName: projects.projectName,
            teamId: teams.teamId,
            teamName: teams.teamName,
            createdBy: tasks.createdBy,
            assignedTo: tasks.assignedTo,
            parentTaskId: tasks.parentTaskId,
            taskStatus: tasks.taskStatus,
            taskPriority: tasks.taskPriority,
            dueDate: tasks.dueDate,
            createdAt: tasks.createdAt,
            updatedAt: tasks.updatedAt,
            completedAt: tasks.completedAt
        })
        .from(tasks)
        .innerJoin(projects, eq(tasks.projectId, projects.projectId))
        .innerJoin(teams, eq(projects.teamId, teams.teamId))
        .where(and(...filters))
        .orderBy(asc(tasks.dueDate))

        return userTasks
    },

    async updateTask(userId: number, taskId: number, updates: updateTaskType) {
        const [existingTask] = await db
        .select({
            taskId: tasks.taskId,
            projectId: tasks.projectId,
            projectStatus: projects.projectStatus,
            assignedTo: tasks.assignedTo,
            taskStatus: tasks.taskStatus,
            taskPriority: tasks.taskPriority,
            dueDate: tasks.dueDate,
            completedAt: tasks.completedAt,
            role: teamMembers.role
        })
        .from(tasks)
        .innerJoin(projects, eq(tasks.projectId, projects.projectId))
        .innerJoin(teamMembers, eq(projects.teamId, teamMembers.teamId))
        .where(and(
            eq(tasks.taskId, taskId),
            eq(teamMembers.userId, userId)
        ))

        if(!existingTask) {
            throw new ApiError(403, "Access Denied")
        }

        if(existingTask.projectStatus === 'archived') {
            throw new ApiError(400, "Cannot update task on a archived projects")
        }

        if(existingTask.taskStatus === 'completed' && existingTask.completedAt) {
            throw new ApiError(400, "Cannot update a completed task")
        } 
        
        const allowedRoles: Role[] = ['admin', 'team_leader']
        if(!allowedRoles.includes(existingTask.role)) {
            throw new ApiError(403, "access Denied")
        }

        await db
        .update(tasks)
        .set(updates)
        .where(eq(tasks.taskId, taskId))

        return {
            ...existingTask,
            ...updates,
            updatedAt: new Date()
        }
    },

    async processTask(userId: number, taskId: number, data: processTaskType) {
        const [existingTask] = await db
        .select({
            taskId: tasks.taskId,
            projectId: tasks.projectId,
            assignedTo: tasks.assignedTo,
            taskStatus: tasks.taskStatus,
            dueDate: tasks.dueDate,
            completedAt: tasks.completedAt,
            projectStatus: projects.projectStatus
        })
        .from(tasks)
        .innerJoin(projects, eq(tasks.projectId, projects.projectId))
        .where(and(
            eq(tasks.taskId, taskId),
            eq(tasks.assignedTo, userId)
        ))

        if(!existingTask) {
            throw new ApiError(403, 'Access Denied')
        }

        if(existingTask.projectStatus === 'archived') {
            throw new ApiError(400, "Cannot process a task in a archived project")
        }

        if(existingTask.dueDate < new Date()) {
            throw new ApiError(400, "Task due date is over")
        }

        if(!statusTransition[existingTask.taskStatus].includes(data.taskStatus)) {
            throw new ApiError(400, "Invalid status")
        }

        const completedAt = data.taskStatus === 'completed' ? new Date(): undefined

        await db
        .update(tasks)
        .set({
            taskStatus: data.taskStatus,
            completedAt: completedAt
        })
        .where(eq(tasks.taskId, taskId))
    },

    async assignTask(userId: number, taskId: number, data: assignTaskType) {
        const [[existingTask], [membership]] = await Promise.all([
            db
            .select({
                taskId: tasks.taskId,
                projectId: tasks.projectId,
                projectStatus: projects.projectStatus,
                createdBy: tasks.createdBy,
                taskStatus: tasks.taskStatus,
                taskPriority: tasks.taskPriority,
                dueDate: tasks.dueDate,
                completedAt: tasks.completedAt,
                role: teamMembers.role
            })
            .from(tasks)
            .innerJoin(projects, eq(tasks.projectId, projects.projectId))
            .innerJoin(teamMembers, eq(projects.teamId, teamMembers.teamId))
            .where(and(
                eq(tasks.taskId, taskId),
                eq(teamMembers.userId, userId)
            )),

            db
            .select({
                taskId: tasks.taskId,
                role: teamMembers.role
            })
            .from(tasks)
            .innerJoin(projects, eq(tasks.projectId, projects.projectId))
            .innerJoin(teamMembers, eq(projects.teamId, teamMembers.teamId))
            .where(and(
                eq(tasks.taskId, taskId),
                eq(teamMembers.userId, data.assignedTo)
            ))
        ]) 

        if(!existingTask) {
            throw new ApiError(403, "Access Denied")
        }

        if(existingTask.projectStatus === 'archived') {
            throw new ApiError(400, "Cannot update task on a archived projects")
        }

        if(existingTask.taskStatus === 'completed' && existingTask.completedAt) {
            throw new ApiError(400, "Cannot update a completed task")
        } 

        if(existingTask.dueDate < new Date()) {
            throw new ApiError(400, "Task due date is over")
        }

        if(!membership) {
            throw new ApiError(400, "Can only assign task to the member of the team")
        }

        const allowedRoles: Role[] = ['admin', 'team_leader']
        if(!allowedRoles.includes(existingTask.role) || existingTask.createdBy !== userId) {
            throw new ApiError(403, "Access Denied")
        }

        await db
        .update(tasks)
        .set(data)
        .where(eq(tasks.taskId, taskId))
    }
}