import { db } from "../config/mysql.config";
import { tasks, taskAssets, projects, teamMembers, NewTask, teams } from "../models/mysql.model";
import { ApiError } from "../utils/apiError";
import { eq, and } from "drizzle-orm";
import { taskType, filterProjectsTaskType } from "../utils/validator";
import { helper } from "./project.service";

export const taskServices = {
    async createTask(userId: number, projectId: number, data: taskType) {
        // check if the project exists
        const {existingProject, membership} = await helper.projectAccess(userId, projectId)

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
        /*
        // check if the user belongs to team task is of
        const [membership] = await db
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
        */
        
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
        .orderBy(tasks.dueDate)

        return userTasks
    }
}