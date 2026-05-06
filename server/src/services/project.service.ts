import { db } from "../config/mysql.config";
import { projects, teamMembers, NewProject, tasks } from "../models/mysql.model";
import { eq, and, count } from "drizzle-orm";
import { ApiError } from "../utils/apiError";
import { projectType, updateProjectType, filterProjectType } from "../utils/validator";

export const helper = {
    // PROJECT SERVICE FUNCTION TO CHECK IF PROJECT EXISTS AND MEMBER HAS ACCESS TO IT
    async projectAccess(userId: number, projectId: number, allowedRoles?: string[]) {
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
        .select()
        .from(teamMembers)
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
        .select()
        .from(teamMembers)
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
            startDate: data.startDate,
            endDate: data.endDate,
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

        return insertedProject
    },

    // GET PROJECTS SERVICE FUNCTION
    async getProjects(userId: number, teamId: number, filter: filterProjectType) {
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

        // if the user is only the member do not allow to see the archived projects
        if(membership.role === 'member' && filter.projectStatus === 'archived') {
            throw new ApiError(403, "Access Denied")
        }

        const isMember: boolean = membership.role === 'member'
        const statusFilter = isMember ? 'active' : filter.projectStatus
        const queryfilters = [eq(projects.teamId, teamId)]
        
        // if the filter is present query the database according to the filter
        if(statusFilter) {
            queryfilters.push(eq(projects.projectStatus, statusFilter))
        }

        // get the filtered data
        const teamProjects = await db
        .select()
        .from(projects)
        .where(and(...queryfilters))

        return teamProjects
        
    },

    // GET PROJECT DETAILS SERVICE FUNCTION
    async getProjectDetails(userId: number, projectId: number) {
        // check if the project exists
        const {existingProject, membership} = await helper.projectAccess(userId, projectId)

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
        const { existingProject, membership} = await helper.projectAccess(userId, projectId, ['admin','team_leader'])

        // if the end date is lesser than start date throw error
        if(updates.endDate && updates.endDate <= existingProject.startDate) {
            throw new ApiError(400, "End date must be greater than start date")
        } 

        // update the project
        await db
        .update(projects)
        .set(updates)
        .where(eq(projects.projectId, projectId))

        return {
            ...existingProject, 
            ...updates,          
            updatedAt: new Date()
        }
    },

    // ARCHIVE PROJECT SERVICE FUNCTION
    async archiveProject(userId: number, projectId: number) {
        const { existingProject, membership} = await helper.projectAccess(userId, projectId, ['admin', 'team_leader'])

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
    },

    // RESTORE PROJECT SERVICE FUNCTION
    async restoreProject(userId: number, projectId: number) {
        const { existingProject, membership} = await helper.projectAccess(userId, projectId, ['admin', 'team_leader'] )

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

        return {
            ...existingProject,
            projectStatus: 'active'
        }
    },

    // DELETE PROJECT SERVICE FUNCTION
    async deleteProject(userId: number, projectId: number) {
        const { existingProject, membership} = await helper.projectAccess(userId, projectId, ['admin', 'team_leader'] )

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
    },
}