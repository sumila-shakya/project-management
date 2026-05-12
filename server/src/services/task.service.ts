import { db } from "../config/mysql.config";
import { tasks, taskAssets, projects, teamMembers, NewTask, teams } from "../models/mysql.model";
import { ApiError } from "../utils/apiError";
import { eq, and, asc, like } from "drizzle-orm";
import { taskType, filterTaskType, updateTaskType, processTaskType, assignTaskType } from "../utils/validator";
import { helper } from "./project.service";
import { statusTransition } from "../utils/statusTransition";
import { Role } from "../@types/interface";
import { AnalyticsLog } from "../models/mongodb.model";

export const taskServices = {
    async createTask(userId: number, projectId: number, data: taskType) {
        // check if the project exists
        const {existingProject, membership} = await helper.projectAccess(userId, projectId)

        // throw error if the project was archived
        if(existingProject.projectStatus === 'archived') {
            throw new ApiError(400, "Cannot add task to archived projects")
        }

        // throw error if the task due date is greater than the projects end date
        if(data.dueDate && data.dueDate > existingProject.endDate) {
            throw new ApiError(400, `Task due date must not be greater than the projects end date ${existingProject.endDate}`)
        }

        if(data.assignedTo) {
            // check if the user to assign to is the meber of the team
            const [isMember] = await db
            .select()
            .from(teamMembers)
            .where(and(
                eq(teamMembers.teamId, existingProject.teamId),
                eq(teamMembers.userId, data.assignedTo)
            ))

            // throw error if the user to assign to is not the member of the team
            if(!isMember) {
                throw new ApiError(400, "Can only assign task to the member of the team")
            }
        }

        if(data.parentTaskId) {
            // check if the parent task exists
            const [existingParentTask] = await db
            .select()
            .from(tasks)
            .where(and(
                eq(tasks.taskId, data.parentTaskId),
                eq(tasks.projectId, existingProject.projectId)
            ))

            // throw error if the parent task doesn't exists
            if(!existingParentTask) {
                throw new ApiError(400, "Parent task not found")
            }
        }

        const newTask: NewTask = {
            createdBy: userId,
            projectId: projectId,
            ...data
        }

        // insert the new task into the database
        const [result] = await db
        .insert(tasks)
        .values(newTask)

        // write into the analytics log
        await AnalyticsLog.create({
            taskId: result.insertId,
            userId: userId,
            action: 'created',
            timestamp: new Date()
        })

        // get the new inserted task
        const [insertedTask] = await db
        .select()
        .from(tasks)
        .where(eq(tasks.taskId, result.insertId))

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
            projectStatus: projects.projectStatus,
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
            completedAt: tasks.completedAt,
            role: teamMembers.role
        })
        .from(tasks)
        .innerJoin(projects, eq(tasks.projectId, projects.projectId))
        .innerJoin(teams, eq(projects.teamId, teams.teamId))
        .innerJoin(teamMembers, eq(teams.teamId, teamMembers.teamId))
        .where(and(
            eq(tasks.taskId, taskId),
            eq(teamMembers.userId, userId)
        ))

        // throw error if the task details is not found
        if(!taskDetails) {
            throw new ApiError(403, "Access Denied")
        }

        // if the user is only the member do not allow to see the task of archived projects
        if(taskDetails.projectStatus === 'archived' && taskDetails.role === 'member') {
            throw new ApiError(403, "Access denied")
        }

        return taskDetails
    },

    async getTasksInProjects(userId: number, projectId: number, queryFilters: filterTaskType) {
        // check if the project exists
        const {existingProject, membership} = await helper.projectAccess(userId, projectId)

        // if the user is only the member do not allow to see the tasks of archived projects
        if(existingProject.projectStatus === 'archived' && membership.role === 'member') {
            throw new ApiError(403, "Access Denied")
        }

        // filter only the tasks belonging to the project mentioned
        const filters = [eq(tasks.projectId, existingProject.projectId)]

        // add filter for task title
        if(queryFilters.title) {
            filters.push(like(tasks.title, `%${queryFilters.title}%`))
        }

        // add filter for task priority
        if(queryFilters.taskPriority) {
            filters.push(eq(tasks.taskPriority, queryFilters.taskPriority))
        }

        // add filter for task status
        if(queryFilters.taskStatus) {
            filters.push(eq(tasks.taskStatus, queryFilters.taskStatus))
        }

        // get all the tasks according to the filter
        const allTasks = await db
        .select()
        .from(tasks)
        .where(and(...filters))
        .orderBy(asc(tasks.dueDate))

        return allTasks
    },

    async getMyTasks(userId: number, queryFilters: filterTaskType) {
        // filter the tasks assigned to the user
        const filters = [eq(tasks.assignedTo, userId)]

        // filter only the tasks from the active projects
        filters.push(eq(projects.projectStatus, 'active'))

        // add filter for task title
        if(queryFilters.title) {
            filters.push(like(tasks.title, `%${queryFilters.title}%`))
        }

        // add filter for task priority
        if(queryFilters.taskPriority) {
            filters.push(eq(tasks.taskPriority, queryFilters.taskPriority))
        }

        // add filter for task status
        if(queryFilters.taskStatus) {
            filters.push(eq(tasks.taskStatus, queryFilters.taskStatus))
        }

        // get the filtered tasks
        const userTasks = await db
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
        // get the existing task
        const [existingTask] = await db
        .select({
            taskId: tasks.taskId,
            title: tasks.title,
            description: tasks.description,
            projectId: tasks.projectId,
            projectStatus: projects.projectStatus,
            assignedTo: tasks.assignedTo,
            taskStatus: tasks.taskStatus,
            taskPriority: tasks.taskPriority,
            dueDate: tasks.dueDate,
            completedAt: tasks.completedAt,
            projectEndDate: projects.endDate,
            role: teamMembers.role
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
        if(existingTask.projectStatus === 'archived') {
            throw new ApiError(400, "Cannot update task on a archived projects")
        }

        // throw error if the task was completed
        if(existingTask.taskStatus === 'completed' && existingTask.completedAt) {
            throw new ApiError(400, "Cannot update a completed task")
        } 
        
        const allowedRoles: Role[] = ['admin', 'team_leader']

        // throw error if the user is not the admin or team leader
        if(!allowedRoles.includes(existingTask.role)) {
            throw new ApiError(403, "access Denied")
        }

        // throw error if the task due date is greater than the projects end date
        if(updates.dueDate && updates.dueDate > existingTask.projectEndDate) {
            throw new ApiError(400, `Task due date must not be greater than the projects end date ${existingTask.projectEndDate}`)
        }

        // update the tasks
        const [result] = await db
        .update(tasks)
        .set(updates)
        .where(eq(tasks.taskId, taskId))

        // if no record was updated throw error
        if(result.affectedRows === 0) {
            throw new ApiError(400, "Invalid update data")
        }

        // get all the changes
        const changes = getChanges(existingTask, updates)

        // write the changes in analytics log
        await AnalyticsLog.create({
            taskId: taskId,
            userId: userId,
            action: 'updated',
            changes: changes,
            timestamp: new Date()
        })

        return {
            ...existingTask,
            ...updates,
            updatedAt: new Date()
        }
    },

    async processTask(userId: number, taskId: number, data: processTaskType) {
        // check for the existing task that was assigned to the user
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

        // if the task doesn't exists throw error
        if(!existingTask) {
            throw new ApiError(403, 'Access Denied')
        }

        // throw error if the project was archived
        if(existingTask.projectStatus === 'archived') {
            throw new ApiError(400, "Cannot process a task in a archived project")
        }

        // throw error if the task is past due date
        if(existingTask.dueDate < new Date()) {
            throw new ApiError(400, "Task due date is over")
        }

        // throw error if the task status is invalid
        if(!statusTransition[existingTask.taskStatus].includes(data.taskStatus)) {
            throw new ApiError(400, "Invalid status")
        }

        // check if the task was completed
        const completedAt = data.taskStatus === 'completed' ? new Date(): undefined

        // update the task
        await db
        .update(tasks)
        .set({
            taskStatus: data.taskStatus,
            completedAt: completedAt
        })
        .where(eq(tasks.taskId, taskId))

        // record the changes
        const changes = []
        changes.push({
            field: 'taskStatus',
            oldValue: existingTask.taskStatus,
            newValue: data.taskStatus
        })

        if(completedAt) {
            changes.push({
                field: 'completedAt',
                oldValue: existingTask.completedAt,
                newValue: completedAt
            })
        }

        // write the changes to the analytics log
        await AnalyticsLog.create({
            taskId: taskId,
            userId: userId,
            action: data.taskStatus === 'completed' ? 'completed' : 'updated',
            changes: changes,
            timestamp: new Date()
        })
    },

    async assignTask(userId: number, taskId: number, data: assignTaskType) {
        const [[existingTask], [membership]] = await Promise.all([
            // check if the user is the meber of the team
            db
            .select({
                taskId: tasks.taskId,
                projectId: tasks.projectId,
                projectStatus: projects.projectStatus,
                createdBy: tasks.createdBy,
                assignedTo:tasks.assignedTo,
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

            // check if the user to assign to is also the meber of the team
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

        // throw error if the task was not found
        if(!existingTask) {
            throw new ApiError(403, "Access Denied")
        }

        // throw error if the project was archived
        if(existingTask.projectStatus === 'archived') {
            throw new ApiError(400, "Cannot assign task on a archived projects")
        }

        // throw error if the task was completed
        if(existingTask.taskStatus === 'completed' && existingTask.completedAt) {
            throw new ApiError(400, "Cannot assign a completed task")
        } 

        // throw error if the task is past due date
        if(existingTask.dueDate < new Date()) {
            throw new ApiError(400, "Task due date is over")
        }

        // throw error if the user to assign to is not the member of the team
        if(!membership) {
            throw new ApiError(400, "Can only assign task to the member of the team")
        }

        const allowedRoles: Role[] = ['admin', 'team_leader']

        // throw error if the user is not the admin, team leader or the creator of the task
        if(!allowedRoles.includes(existingTask.role) && existingTask.createdBy !== userId) {
            throw new ApiError(403, "Access Denied")
        }

        // throw error if the task was already assigned to the same person
        if(existingTask.assignedTo === data.assignedTo) {
            throw new ApiError(400, `Task already assigned to user ${data.assignedTo}`)
        }

        // update the task
        await db
        .update(tasks)
        .set(data)
        .where(eq(tasks.taskId, taskId))

        // write into the analytics log
        await AnalyticsLog.create({
            taskId: taskId,
            userId: userId,
            action: 'assigned',
            changes: [{
                field: 'assignedTo',
                oldValue: existingTask.assignedTo,
                newValue: data.assignedTo
            }],
            timestamp: new Date()
        })
    },

    async getSubTasks(userId: number, taskId: number) {
        // check for the existing task
        const [existingTask] = await db
        .select({
            taskId: tasks.taskId,
            projectStatus: projects.projectStatus,
            role: teamMembers.role
        })
        .from(tasks)
        .innerJoin(projects, eq(tasks.projectId, projects.projectId))
        .innerJoin(teamMembers, eq(projects.teamId, teamMembers.teamId))
        .where(and(
            eq(tasks.taskId, taskId),
            eq(teamMembers.userId, userId)
        ))

        // throw error if the task is not found
        if(!existingTask) {
            throw new ApiError(403, "Access Denied")
        }

        // if the user is only the member do not allow to see the tasks of archived projects
        if(existingTask.projectStatus === 'archived' && existingTask.role === 'member') {
            throw new ApiError(403, "Access Denied")
        }

        // get all the sub tasks
        const subtasks = await db
        .select()
        .from(tasks)
        .where(eq(tasks.parentTaskId, taskId))

        return subtasks
    }
}


const getChanges = (
    oldValue: Record<string, unknown>,
    newValue: Record<string, unknown>
) => {
    const changes = Object.keys(newValue).filter((key) => newValue[key] !== undefined)
    .map((key) => {
        return {
            field: key,
            oldValue: oldValue[key],
            newValue: newValue[key]
        }
    })

    return changes
}