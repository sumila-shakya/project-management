import { db } from "../config/mysql.config";
import { projects, teamMembers, NewProject, tasks, users, teams, NewNotification } from "../models/mysql.model";
import { eq, and, count, asc, ne } from "drizzle-orm";
import { ApiError } from "../utils/apiError";
import { projectType, updateProjectType, filterProjectType } from "../validator/project.validator";
import { Role, IAnalyticsLog, NotificationType } from "../@types/interface";
import { AnalyticsLog } from "../models/mongodb.model";
import { DEFAULT_PAGE_LIMIT } from "../utils/constants";
import { systemEmitter } from "../events/system.events";
import { teamMembersServices } from "./team.service";

export const projectGuard = {
    // PROJECT SERVICE FUNCTION TO CHECK IF PROJECT EXISTS AND MEMBER HAS ACCESS TO IT
    async validateAccess(userId: number, projectId: number, allowedRoles?: Role[]) {
        // check if the project exists
        const [existingProject] = await db
        .select()
        .from(projects)
        .where(eq(projects.projectId, projectId))

        // if projects is not found throw error
        if(!existingProject) {
            throw new ApiError(404, "Project Not found")
        }

        // check if the user is the member of the team project belonging to
        const [membership] = await db
        .select({
            id: teamMembers.id,
            teamId: teamMembers.teamId,
            teamName: teams.teamName,
            userId: teamMembers.userId,
            userName: users.name,
            role: teamMembers.role
        })
        .from(teamMembers)
        .innerJoin(users, eq(teamMembers.userId, users.userId))
        .innerJoin(teams, eq(teamMembers.teamId, teams.teamId))
        .where(and(
            eq(teamMembers.teamId, existingProject.teamId),
            eq(teamMembers.userId, userId)
        ))

        // if the user is not member throw error
        if(!membership) {
            throw new ApiError(403, "Access Denied")
        }

        // if the user doesn't have access throw error
        if(allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(membership.role)) {
            throw new ApiError(403, "Access Denied")
        }

        // return project and members information
        return { existingProject, membership }
    }
}

export const projectServices = {
    // CREATE PROJECT SERVICE FUNCTION
    async createProject(userId: number, teamId: number, data: projectType) {
        // check if the user is the member of the team
        const [isMember] = await db
        .select({
            teamName: teams.teamName,
            userName: users.name
        })
        .from(teamMembers)
        .innerJoin(teams, eq(teamMembers.teamId, teams.teamId))
        .innerJoin(users, eq(teamMembers.userId, users.userId))
        .where(and(
            eq(teamMembers.teamId, teamId),
            eq(teamMembers.userId, userId)
        ))

        // if the user is not the member throw error
        if(!isMember) {
            throw new ApiError(403, "Access denied")
        }

        const newProject: NewProject = {
            projectName: data.projectName,
            teamId: teamId, 
            createdBy: userId,
            endDate: data.endDate,
            ...(data.startDate && { startDate: data.startDate}),
            ...(data.description && { description: data.description})
        }

        // insert new project into the database
        const [result] = await db
        .insert(projects)
        .values(newProject)

        // get the inserted project
        const [insertedProject] = await db
        .select()
        .from(projects)
        .where(eq(projects.projectId, result.insertId))

        /* ------------------------------------ notification ------------------------------------ */
        const allTeamMembers = await teamMembersServices.getTeamMembersIds(teamId)

        const recipients = allTeamMembers.filter((memberId) => memberId !== userId)
        const message = `User [${isMember.userName}](${userId}) created new a project in team [${isMember.teamName}](${teamId})`
        const notificationType: NotificationType = 'project_created'

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

        return insertedProject
    },

    // GET PROJECTS SERVICE FUNCTION
    async getProjects(userId: number, teamId: number, filter: filterProjectType) {
        const page = filter.page || 1
        const limit = filter.limit || DEFAULT_PAGE_LIMIT
        const offset = (page - 1)*limit

        // check if the user is the member of the team
        const [membership] = await db
        .select()
        .from(teamMembers)
        .where(and(
            eq(teamMembers.teamId, teamId),
            eq(teamMembers.userId, userId)
        ))

        // if the user is not the member throw error
        if(!membership) {
            throw new ApiError(403, "Access denied")
        }

        const queryfilters = [eq(projects.teamId, teamId)]
        
        // if the filter is present query the database according to the filter
        if(filter.projectStatus) {
            queryfilters.push(eq(projects.projectStatus, filter.projectStatus))
        }

        // get the filtered data
        const [teamProjects, [projectCounts]] = await Promise.all([
            db
            .select()
            .from(projects)
            .where(and(...queryfilters))
            .orderBy(asc(projects.projectId))
            .offset(offset)
            .limit(limit),

            db
            .select({
                total: count()
            })
            .from(projects)
            .where(and(...queryfilters))
        ])

        return {
            paginationInfo: {
                totalProjectCount: projectCounts.total,
                totalPages: Math.ceil(projectCounts.total/limit),
                page: page,
                limit: limit
            },
            teamProjects
        }
        
    },

    // GET PROJECT DETAILS SERVICE FUNCTION
    async getProjectDetails(userId: number, projectId: number) {
        // check if the project exists
        const {existingProject, membership} = await projectGuard.validateAccess(userId, projectId)

        // get the total tasks and completed tasks in the project
        const [[tasksCount], [completedTasksCount]] = await Promise.all([
            await db
            .select({
                total: count()
            })
            .from(tasks)
            .where(eq(tasks.projectId, existingProject.projectId)),

            await db
            .select({
                total: count()
            })
            .from(tasks)
            .where(and(
                eq(tasks.projectId, existingProject.projectId),
                eq(tasks.taskStatus, 'completed')
            ))
        ])

        return {
            ...existingProject,
            totalTasks: tasksCount.total,
            totalCompletedTasks: completedTasksCount.total
        }
    },

    // UPDATE PROJECT SERVICE FUNCTION
    async updateProject(userId: number, projectId: number, updates: updateProjectType) {
        const { existingProject, membership} = await projectGuard.validateAccess(userId, projectId, ['admin','team_leader'])

        if(existingProject.projectStatus === 'archived') {
            throw new ApiError(403, "This project is archived. Cannot update on a archived project")
        }

        // if the end date is lesser than start date throw error
        if(updates.endDate && updates.endDate <= existingProject.startDate) {
            throw new ApiError(400, "End date must be greater than start date")
        } 

        // update the project
        await db
        .update(projects)
        .set(updates)
        .where(eq(projects.projectId, projectId))

        /* ------------------------------------ notification ------------------------------------ */

        const allTeamMembers = await teamMembersServices.getTeamMembersIds(existingProject.teamId)
        const recipients = allTeamMembers.filter((memberId) => memberId !== userId)
        const message = `User [${membership.userName}](${userId}) updated project [${existingProject.projectName}](${projectId})`
        const notificationType: NotificationType = 'project_updated'

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
            ...existingProject, 
            ...updates,          
            updatedAt: new Date()
        }
    },

    // ARCHIVE PROJECT SERVICE FUNCTION
    async archiveProject(userId: number, projectId: number) {
        const { existingProject, membership} = await projectGuard.validateAccess(userId, projectId, ['admin', 'team_leader'])

        // archive the active project
        const [result] = await db
        .update(projects)
        .set({
            projectStatus: 'archived'
        })
        .where(and(
            eq(projects.projectId, existingProject.projectId),
            eq(projects.projectStatus, 'active')
        ))

        // throw error if no projects was archived
        if(result.affectedRows === 0) {
            throw new ApiError(400, "Project already archived")
        }

        /* ------------------------------------ notification ------------------------------------ */

        const allTeamMembers = await teamMembersServices.getTeamMembersIds(existingProject.teamId)
        const recipients = allTeamMembers.filter((memberId) => memberId !== userId)
        const message = `User [${membership.userName}](${userId}) archived project [${existingProject.projectName}](${projectId})`
        const notificationType: NotificationType = 'project_archived'

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
    },

    // RESTORE PROJECT SERVICE FUNCTION
    async restoreProject(userId: number, projectId: number) {
        const { existingProject, membership} = await projectGuard.validateAccess(userId, projectId, ['admin', 'team_leader'] )

        // restore the archived project
        const [result] = await db
        .update(projects)
        .set({
            projectStatus: 'active'
        })
        .where(and(
            eq(projects.projectId, existingProject.projectId),
            eq(projects.projectStatus, 'archived')
        ))

        // throw error if no projects was restored
        if(result.affectedRows === 0) {
            throw new ApiError(400, "Project is already active")
        }

        /* ------------------------------------ notification ------------------------------------ */

        const allTeamMembers = await teamMembersServices.getTeamMembersIds(existingProject.teamId)
        const recipients = allTeamMembers.filter((memberId) => memberId !== userId)
        const message = `User [${membership.userName}](${userId}) restored project [${existingProject.projectName}](${projectId})`
        const notificationType: NotificationType = 'project_restored'

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
            ...existingProject,
            projectStatus: 'active'
        }
    },

    // DELETE PROJECT SERVICE FUNCTION
    async deleteProject(userId: number, projectId: number) {
        const { existingProject, membership} = await projectGuard.validateAccess(userId, projectId, ['admin'] )

        // get all the tasks belonging to the project
        const allTasks = await db
        .select()
        .from(tasks)
        .where(eq(tasks.projectId, existingProject.projectId))

        const logs: IAnalyticsLog[] = allTasks.map(data => {
            const log: IAnalyticsLog = {
                actor: {
                    userId: String(userId),
                    userName: membership.userName,
                    role: membership.role
                },
                target: {
                    taskId: String(data.taskId),
                    taskName: data.title
                },
                action: 'deleted',
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
            return log
        })

        // delete the archived project
        const [result] = await db
        .delete(projects)
        .where(and(
            eq(projects.projectId, existingProject.projectId),
            eq(projects.projectStatus, 'archived')
        ))

        // throw error if no projects was deleted
        if(result.affectedRows === 0) {
            throw new ApiError(400, "Please archive the project first")
        }

        // write into the log
        await AnalyticsLog.insertMany(logs)
    },
}