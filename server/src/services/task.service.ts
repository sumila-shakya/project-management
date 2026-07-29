import { db } from "../config/mysql.config";
import { tasks, projects, teamMembers, users, NewTask, teams, NewNotification } from "../models/mysql.model";
import { ApiError } from "../utils/apiError";
import { eq, and, asc, like, count, lte, gt, ne, lt, inArray } from "drizzle-orm";
import { taskType, filterTaskType, updateTaskType, processTaskType, assignTaskType } from "../validator/task.validator";
import { paginationType } from "../validator/global.validator";
import { projectGuard } from "./project.service";
import { statusTransition } from "../utils/status-transition";
import { Role, IAnalyticsLog, IChanges, NotificationType } from "../@types/interface";
import { DEFAULT_PAGE_LIMIT, DEADLINE_LEVEL_TIME, DEADLINE_LEVEL_MESSAGE } from "../utils/constants";
import { teamMembersServices } from "./team.service";
import { systemEmitter } from "../events/system.events";

// VALIDATE USER ACCESS FUNCTION
export const taskGuard = {
    async validateAccess(userId: number, taskId: number, allowedRoles?: Role[]) {
        const [existingTask] = await db
        .select({
            taskId: tasks.taskId,
            title: tasks.title,
            description: tasks.description,
            createdBy: tasks.createdBy,
            assignedTo: tasks.assignedTo,
            taskStatus: tasks.taskStatus,
            taskPriority: tasks.taskPriority,
            dueDate: tasks.dueDate,
            createdAt: tasks.createdAt,
            completedAt: tasks.completedAt,
            projectId: tasks.projectId,
            projectName: projects.projectName,
            projectStatus: projects.projectStatus,
            projectEndDate: projects.endDate,
            teamId: projects.teamId,
            teamName: teams.teamName,
            userName: users.name,
            role: teamMembers.role
        })
        .from(tasks)
        .innerJoin(projects, eq(tasks.projectId, projects.projectId))
        .innerJoin(teams, eq(projects.teamId, teams.teamId))
        .innerJoin(teamMembers, eq(teams.teamId, teamMembers.teamId))
        .innerJoin(users, eq(teamMembers.userId, users.userId))
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
            throw new ApiError(400, "Cannot work on a task on a archived projects")
        }

        // if the user doesn't have access throw error
        if(allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(existingTask.role)) {
            throw new ApiError(403, "Access Denied")
        }

        return existingTask
    }
}

export const taskServices = {
    // CREATE TASK SERVICE FUNCTION
    async createTask(userId: number, projectId: number, data: taskType) {
        // check if the project exists
        const {existingProject, membership} = await projectGuard.validateAccess(userId, projectId)

        // throw error if the project was archived
        if(existingProject.projectStatus === 'archived') {
            throw new ApiError(400, "Cannot add task to archived projects")
        }

        // throw error if the task due date is greater than the projects end date
        if(data.dueDate && data.dueDate > existingProject.endDate) {
            throw new ApiError(400, `Task due date must not be greater than the projects end date ${existingProject.endDate}`)
        }

        if(data.assignedTo) {
            // check if the user to assign to is the member of the team
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

        const log: IAnalyticsLog = {
            actor: {
                userId: String(userId),
                userName: membership.userName,
                role: membership.role
            },
            target: {
                taskId: String(result.insertId),
                taskName: data.title
            },
            action: 'created',
            team: {
                teamId: String(membership.teamId),
                teamName: membership.teamName
            },
            project: {
                projectId: String(existingProject.projectId),
                projectName: existingProject.projectName
            },
            timestamp: new Date()
        }

        // write into the analytics log
        if(result) {
            systemEmitter.emit('analytics_log_generated', [log])
        }

        // get the new inserted task
        const [insertedTask] = await db
        .select()
        .from(tasks)
        .where(eq(tasks.taskId, result.insertId))

        /* ------------------------------------ notification ------------------------------------ */
        
        const allTeamMembers = await teamMembersServices.getTeamMembersIds(existingProject.teamId)
        const recipients = allTeamMembers.filter((memberId) => memberId !== userId)
        const message = `User [${membership.userName}](${userId}) created a new task on project [${existingProject.projectName}](${projectId})`
        const notificationType: NotificationType = 'task_created'

        const newNotifications: NewNotification[] = recipients.map((recipientId) => {
            const notification: NewNotification = {
                message: message,
                recipientId: recipientId,
                notificationType: notificationType
            }
        
            return notification
        })
        
        if(recipients.length > 0) {
            systemEmitter.emit('notification_generated', newNotifications)
        }
        
        /* ------------------------------------ notification ------------------------------------ */

        return insertedTask
    },

    // GET TASK DETAILS SERVICE FUNCTION
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

        return taskDetails
    },

    // GET LIST OF TASKS IN PROJECT SERVICE FUNCTION
    async getTasksInProjects(userId: number, projectId: number, queryFilters: filterTaskType) {
        // check if the project exists
        const {existingProject, membership} = await projectGuard.validateAccess(userId, projectId)

        // get the pagination data
        const page = queryFilters.page || 1
        const limit = queryFilters.limit || DEFAULT_PAGE_LIMIT
        const offset = (page - 1)*limit

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
        const [allTasks, [taskCount]] = await Promise.all([
            db
            .select()
            .from(tasks)
            .where(and(...filters))
            .orderBy(asc(tasks.dueDate), asc(tasks.taskId))
            .offset(offset)
            .limit(limit),

            db
            .select({
                total: count()
            })
            .from(tasks)
            .where(and(...filters))
        ])

        return {
            paginationInfo: {
                totalTaskCount: taskCount.total,
                totalPages: Math.ceil(taskCount.total/limit),
                page: page,
                limit: limit
            },
            allTasks
        }
    },

    // GET USER TASK SERVICE FUNCTION
    async getMyTasks(userId: number, queryFilters: filterTaskType) {
        // get the pagination data
        const page = queryFilters.page || 1
        const limit = queryFilters.limit || DEFAULT_PAGE_LIMIT
        const offset = (page - 1)*limit

        // filter the tasks assigned to the user
        const filters = [eq(tasks.assignedTo, userId)]

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
        const [userTasks, [taskCount]] = await Promise.all([
            db
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
            .orderBy(asc(tasks.dueDate), asc(tasks.taskId))
            .offset(offset)
            .limit(limit),

            db
            .select({
                total: count()
            })
            .from(tasks)
            .where(and(...filters))
        ])

        return {
            paginationInfo: {
                totalTaskCount: taskCount.total,
                totalPages: Math.ceil(taskCount.total/limit),
                page: page,
                limit: limit
            },
            userTasks
        }
    },

    // UPDATE TASK SERVICE FUNCTION
    async updateTask(userId: number, taskId: number, updates: updateTaskType) {
        const existingTask = await taskGuard.validateAccess(userId, taskId, ['admin', 'team_leader'])

        // throw error if the task was completed
        if(existingTask.taskStatus === 'completed' && existingTask.completedAt) {
            throw new ApiError(400, "Cannot update a completed task")
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
            throw new ApiError(400, "No changes applied")
        }

        // get all the changes
        const changes: IChanges[] = getChanges(existingTask, updates)

        const log: IAnalyticsLog = {
            actor: {
                userId: String(userId),
                userName: existingTask.userName,
                role: existingTask.role
            },
            target: {
                taskId: String(taskId),
                taskName: existingTask.title
            },
            action: 'updated',
            changes: changes,
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

        // write the changes in analytics log
        systemEmitter.emit('analytics_log_generated', [log])

        /* ------------------------------------ notification ------------------------------------ */
        
        const allTeamMembers = await teamMembersServices.getTeamMembersIds(existingTask.teamId)
        const recipients = allTeamMembers.filter((memberId) => memberId !== userId)
        const message = `User [${existingTask.userName}](${userId}) updated the task [${existingTask.title}](${taskId})`
        const notificationType: NotificationType = 'task_updated'

        const newNotifications: NewNotification[] = recipients.map((recipientId) => {
            const notification: NewNotification = {
                message: message,
                recipientId: recipientId,
                notificationType: notificationType
            }
        
            return notification
        })
        
        if(recipients.length > 0) {
            systemEmitter.emit('notification_generated', newNotifications)
        }
        
        /* ------------------------------------ notification ------------------------------------ */

        return {
            ...existingTask,
            ...updates,
            updatedAt: new Date()
        }
    },

    // PROCESS TASK SERVICE FUNCTION
    async processTask(userId: number, taskId: number, data: processTaskType) {
        // check for the existing task that was assigned to the user
        const [existingTask] = await db
        .select({
            taskId: tasks.taskId,
            title: tasks.title,
            projectId: tasks.projectId,
            projectName: projects.projectName,
            teamId: projects.teamId,
            teamName: teams.teamName,
            taskStatus: tasks.taskStatus,
            dueDate: tasks.dueDate,
            completedAt: tasks.completedAt,
            projectStatus: projects.projectStatus,
            userName: users.name,
            role: teamMembers.role

        })
        .from(tasks)
        .innerJoin(projects, eq(tasks.projectId, projects.projectId))
        .innerJoin(teams, eq(projects.teamId, teams.teamId))
        .innerJoin(teamMembers, eq(teams.teamId, teamMembers.teamId))
        .innerJoin(users, eq(teamMembers.userId, users.userId))
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
        const changes: IChanges[] = []
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


            /* ------------------------------------ notification ------------------------------------ */
            
            const allTeamMembers = await teamMembersServices.getTeamMembersIds(existingTask.teamId)
            const recipients = allTeamMembers.filter((memberId) => memberId !== userId)
            const message = `User [${existingTask.userName}](${userId}) completed task [${existingTask.title}](${taskId})`
            const notificationType: NotificationType = 'task_completed'

            const newNotifications: NewNotification[] = recipients.map((recipientId) => {
            const notification: NewNotification = {
                message: message,
                recipientId: recipientId,
                notificationType: notificationType
            }

            return notification
        })
            
            if(recipients.length > 0) {
                systemEmitter.emit('notification_generated', newNotifications)
            }
            /* ------------------------------------ notification ------------------------------------ */
        }

        const log: IAnalyticsLog = {
            actor: {
                userId: String(userId),
                userName: existingTask.userName,
                role: existingTask.role
            },
            target: {
                taskId: String(taskId),
                taskName: existingTask.title
            },
            action: data.taskStatus === 'completed' ? 'completed' : 'updated',
            changes: changes,
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

        // write the changes to the analytics log
        systemEmitter.emit('analytics_log_generated', [log])
    },

    // ASSIGN TASK SERVICE FUNCTION
    async assignTask(userId: number, taskId: number, data: assignTaskType) {
        const existingTask = await taskGuard.validateAccess(userId, taskId)

        // check if the user to assign to is also the member of the team
        const [membership] = await db
        .select({
            taskId: tasks.taskId,
            userName: users.name,
            role: teamMembers.role
        })
        .from(tasks)
        .innerJoin(projects, eq(tasks.projectId, projects.projectId))
        .innerJoin(teamMembers, eq(projects.teamId, teamMembers.teamId))
        .innerJoin(users, eq(teamMembers.userId, users.userId))
        .where(and(
            eq(tasks.taskId, taskId),
            eq(teamMembers.userId, data.assignedTo)
        ))

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

        const log: IAnalyticsLog = {
            actor: {
                userId: String(userId),
                userName: existingTask.userName,
                role: existingTask.role
            },
            target: {
                taskId: String(taskId),
                taskName: existingTask.title
            },
            action: 'assigned',
            changes: [{
                field: 'assignedTo',
                oldValue: existingTask.assignedTo,
                newValue: data.assignedTo
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

        // write into the analytics log
        systemEmitter.emit('analytics_log_generated', [log])

        /* ------------------------------------ notification ------------------------------------ */

        const allTeamMembers = await teamMembersServices.getTeamMembersIds(existingTask.teamId)

        const recipients = allTeamMembers.filter((memberId) => memberId !== userId && memberId !== data.assignedTo )
        const generalMessage = `User [${existingTask.userName}](${userId}) assigned the task [${existingTask.title}](${taskId}) to user [${membership.userName}](${data.assignedTo})`
        const notificationType: NotificationType = 'task_assigned'
        
        const customizedNotification: NewNotification = {
            notificationType: notificationType,
            recipientId: data.assignedTo,
            message: `You are assigned the task [${existingTask.title}](${taskId}) by the user [${existingTask.userName}](${userId})`
        }

        const newNotifications: NewNotification[] = recipients.map((recipientId) => {
            const notification: NewNotification = {
                message: generalMessage,
                recipientId: recipientId,
                notificationType: notificationType
            }
        
            return notification
        })

        if(recipients.length > 0) {
            systemEmitter.emit('notification_generated', newNotifications)
        }
        systemEmitter.emit('notification_generated', [customizedNotification])


        /* ------------------------------------ notification ------------------------------------ */
    },

    // GET SUB TASKS SERVICE FUNCTION
    async getSubTasks(userId: number, taskId: number, paginationData: paginationType) {
        // get the pagination data
        const page = paginationData.page || 1
        const limit = paginationData.limit || DEFAULT_PAGE_LIMIT
        const offset = (page - 1)*limit

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

        // get all the sub tasks
        const [subtasks, [subTaskCount]] = await Promise.all([
            db
            .select()
            .from(tasks)
            .where(eq(tasks.parentTaskId, taskId))
            .orderBy(asc(tasks.dueDate), asc(tasks.taskId))
            .offset(offset)
            .limit(limit),

            db
            .select({
                total: count()
            })
            .from(tasks)
            .where(eq(tasks.parentTaskId, taskId))
        ])

        return {
            paginationInfo: {
                totalTaskCount: subTaskCount.total,
                totalPages: Math.ceil(subTaskCount.total/limit),
                page: page,
                limit: limit
            },
            subtasks
        }
    },

    // DELETE TASK SERVICE FUNCTION
    async deleteTask(userId: number, taskId: number) {
        const existingTask = await taskGuard.validateAccess(userId, taskId, ['admin'])

        const log: IAnalyticsLog = {
            actor: {
                userId: String(userId),
                userName: existingTask.userName,
                role: existingTask.role
            },
            target: {
                taskId: String(taskId),
                taskName: existingTask.title
            },
            action: 'deleted',
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

        // delete the task
        const [result] = await db
        .delete(tasks)
        .where(eq(tasks.taskId, taskId))

        // write into the log
        if(result.affectedRows > 0) {
            systemEmitter.emit('analytics_log_generated', [log])
        }
    },
    
    // NOTIFY DEADLINE APPROACHING SERVICE FUNCTION
    async notifyDeadlineApproaching(level: number) {
        // get the maximum limit for the deadline
        const maxDate: Date = new Date();
        maxDate.setTime(maxDate.getTime() + DEADLINE_LEVEL_TIME[level-1])

        // get the minimum limit for the deadline
        const minDate: Date = new Date();
        if(level > 0 && level < 3) {
            minDate.setTime(minDate.getTime() + DEADLINE_LEVEL_TIME[level])
        }

        // get the query filters
        const filters = [ne(tasks.taskStatus, 'completed')]
        filters.push(gt(tasks.dueDate, minDate))
        filters.push(lte(tasks.dueDate, maxDate))
        filters.push(lt(tasks.deadlineLevel, level))

        await db.transaction(async (tx) => {
            // get the tasks matching the filters
            const tasksDue = await tx
            .select()
            .from(tasks)
            .where(and(...filters))

            if(tasksDue.length > 0) {
                const taskIds: number[] = tasksDue.map((task) => task.taskId)

                // update the task deadline level to avoid spamming the user
                await tx
                .update(tasks)
                .set({
                    deadlineLevel: level
                })
                .where(inArray(tasks.taskId, taskIds))

                const newNotifications: NewNotification[] = tasksDue.map((task) => {
                    const notification: NewNotification = {
                        notificationType: 'deadline_approaching',
                        recipientId: task.assignedTo ? task.assignedTo: task.createdBy,
                        message: `${DEADLINE_LEVEL_MESSAGE[level-1]}: task[${task.title}](${task.taskId}) is due ${task.dueDate}`
                    }
                    return notification
                })

                // send notification to the users
                systemEmitter.emit('notification_generated', newNotifications)
            }
        })
    },

    // NOTIFY OVERDUE TASK SERVICE FUNCTION
    async notifyOverdueTask() {
        await db.transaction(async (tx) => {
            // get the overdue tasks
            const taskOverdue = await tx
            .select()
            .from(tasks)
            .where(and(
                ne(tasks.taskStatus, 'completed'),
                lt(tasks.dueDate, new Date()),
                lt(tasks.deadlineLevel, 4)
            ))

            if(taskOverdue.length > 0) {
                const taskIds: number[] = taskOverdue.map((task) => task.taskId)

                // update the task deadline level to avoid spamming the user
                await tx
                .update(tasks)
                .set({
                    deadlineLevel: 4
                })
                .where(inArray(tasks.taskId, taskIds))

                const newNotifications: NewNotification[] = taskOverdue.map((task) => {
                    const notification: NewNotification = {
                        notificationType: 'task_overdue',
                        recipientId: task.assignedTo ? task.assignedTo: task.createdBy,
                        message: `CRITICAL: task[${task.title}](${task.taskId}) is overdue`
                    }
                    return notification
                })

                // send notification to the users
                systemEmitter.emit('notification_generated', newNotifications)
            }
        })
        
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