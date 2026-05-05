import { db } from "../config/mysql.config";
import { projects, teamMembers, NewProject, tasks } from "../models/mysql.model";
import { eq, and, count } from "drizzle-orm";
import { ApiError } from "../utils/apiError";
import { projectType, updateProjectType, filterProjectType } from "../utils/validator";

const helper = {
    async projectAccess(userId: number, projectId: number) {
        const [existingProject] = await db
        .select()
        .from(projects)
        .where(eq(projects.projectId, projectId))

        if(!existingProject) {
            throw new ApiError(404, "Project Not found")
        }

        const [membership] = await db
        .select()
        .from(teamMembers)
        .where(and(
            eq(teamMembers.teamId, existingProject.teamId),
            eq(teamMembers.userId, userId)
        ))

        const allowedRoles = ['admin', 'team_leader']
        if(!membership || !allowedRoles.includes(membership.role)) {
            throw new ApiError(403, "Access Denied")
        }

        return { existingProject, membership }
    }
}

export const projectServices = {
    // CREATE PROJECT SERVICE FUNCTION
    async createProject(userId: number, teamId: number, data: projectType) {
        const [isMember] = await db
        .select()
        .from(teamMembers)
        .where(and(
            eq(teamMembers.teamId, teamId),
            eq(teamMembers.userId, userId)
        ))

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

        const [result] = await db
        .insert(projects)
        .values(newProject)

        const [insertedProject] = await db
        .select()
        .from(projects)
        .where(eq(projects.projectId, result.insertId))

        return insertedProject
    },

    // GET PROJECTS SERVICE FUNCTION
    async getProjects(userId: number, teamId: number, filter: filterProjectType) {
        const [membership] = await db
        .select()
        .from(teamMembers)
        .where(and(
            eq(teamMembers.teamId, teamId),
            eq(teamMembers.userId, userId)
        ))

        if(!membership) {
            throw new ApiError(403, "Access denied")
        }

        if(membership.role === 'member' && filter.projectStatus === 'archived') {
            throw new ApiError(403, "Access Denied")
        }

        const isMember: boolean = membership.role === 'member'
        const statusFilter = isMember ? 'active' : filter.projectStatus
        const queryfilters = [eq(projects.teamId, teamId)]
        

        if(statusFilter) {
            queryfilters.push(eq(projects.projectStatus, statusFilter))
        }

        const teamProjects = await db
        .select()
        .from(projects)
        .where(and(...queryfilters))

        return teamProjects
        
    },

    async getProjectDetails(userId: number, projectId: number) {
        const [existingProject] = await db
        .select()
        .from(projects)
        .where(eq(projects.projectId, projectId))

        if(!existingProject) {
            throw new ApiError(404, "Project Not found")
        }

        const [membership] = await db
        .select()
        .from(teamMembers)
        .where(and(
            eq(teamMembers.teamId, existingProject.teamId),
            eq(teamMembers.userId, userId)
        ))

        if(!membership) {
            throw new ApiError(403, "Access denied")
        }

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

    async updateProject(userId: number, projectId: number, updates: updateProjectType) {
        const { existingProject, membership} = await helper.projectAccess(userId, projectId)

        if(updates.endDate && updates.endDate <= existingProject.startDate) {
            throw new ApiError(400, "End date must be greater than start date")
        } 

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

    async archiveProject(userId: number, projectId: number) {
        const { existingProject, membership} = await helper.projectAccess(userId, projectId)

        const [result] = await db
        .update(projects)
        .set({
            projectStatus: 'archived'
        })
        .where(and(
            eq(projects.projectId, existingProject.projectId),
            eq(projects.projectStatus, 'active')
        ))

        if(result.affectedRows === 0) {
            throw new ApiError(400, "Project already archived")
        }
    },

    async restoreProject(userId: number, projectId: number) {
        const { existingProject, membership} = await helper.projectAccess(userId, projectId)

        const [result] = await db
        .update(projects)
        .set({
            projectStatus: 'active'
        })
        .where(and(
            eq(projects.projectId, existingProject.projectId),
            eq(projects.projectStatus, 'archived')
        ))

        if(result.affectedRows === 0) {
            throw new ApiError(400, "Project is already active")
        }

        return {
            ...existingProject,
            projectStatus: 'active'
        }
    },

    async deleteProject(userId: number, projectId: number) {
        const { existingProject, membership} = await helper.projectAccess(userId, projectId)

        const [result] = await db
        .delete(projects)
        .where(and(
            eq(projects.projectId, existingProject.projectId),
            eq(projects.projectStatus, 'archived')
        ))

        if(result.affectedRows === 0) {
            throw new ApiError(400, "Please archive the project first")
        }
    },
}