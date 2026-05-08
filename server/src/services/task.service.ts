import { db } from "../config/mysql.config";
import { tasks, taskAssets, projects, teamMembers, NewTask, teams } from "../models/mysql.model";
import { ApiError } from "../utils/apiError";
import { eq, and, asc } from "drizzle-orm";
import { taskType, filterProjectsTaskType, updateTaskType } from "../utils/validator";
import { helper } from "./project.service";

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
        const [existingTask] = await db.select({
            taskId: tasks.taskId,
            taskStatus: tasks.taskStatus,
            completedAt: tasks.completedAt,
            projectId: projects.projectId
        })
        .from(tasks)
        .innerJoin(projects, eq(tasks.projectId, projects.projectId))
        .where(eq(tasks.taskId, taskId))

        if(!existingTask) {
            throw new ApiError(404, "Task not found")
        }

        const {existingProject, membership} = await helper.projectAccess(userId, existingTask.projectId, ['admin','team_leader'])

        if(existingProject.projectStatus === 'archived') {
            throw new ApiError(400, "Cannot update task of a archived projects")
        }

        if(existingTask.taskStatus === 'completed' && existingTask.completedAt) {
            throw new ApiError(400, "Cannot update a completed task")
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
}