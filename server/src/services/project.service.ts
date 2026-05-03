import { db } from "../config/mysql.config";
import { projects, teamMembers, NewProject } from "../models/mysql.model";
import { eq, and } from "drizzle-orm";
import { ApiError } from "../utils/apiError";
import { projectType } from "../utils/validator";

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
    async getProjects(userId: number, teamId: number) {
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

        const teamProjects = await db
        .select()
        .from(projects)
        .where(and(
            eq(projects.teamId, teamId)
        ))

        return teamProjects
    }
}