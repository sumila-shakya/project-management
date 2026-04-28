import { db } from "../config/mysql.config";
import { users, teams, teamMembers, Team, NewTeam, NewTeamMember } from "../models/mysql.model";
import { ApiError } from "../utils/apiError";
import { createTeamType, updateTeamType } from "../utils/validator";
import { and, eq } from "drizzle-orm";

export const teamServices = {
    // CREATE TEAM SERVICE FUNCTION
    async createTeam(userId: number, data: createTeamType) {
        const newTeam: NewTeam = {
            teamName: data.teamName,
            createdBy: userId,
            ...(data.description && {description: data.description})
        }

        // insert the new team into the database
        const [team] = await db
        .insert(teams)
        .values(newTeam)

        const newTeamMember: NewTeamMember = {
            teamId: team.insertId,
            userId: userId,
            role: 'admin'
        }

        // make the user the adminof the new team
        await db
        .insert(teamMembers)
        .values(newTeamMember)

        return {
            teamId: team.insertId,
            teamName: data.teamName,
            ...(data.description && {description: data.description})
        }
    },

    // GET USERS TEAMS SERVICE FUNCTION
    async getTeams(userId: number) {
        // get all the teams where user is member
        const userTeams = await db
        .select({
            teamId: teams.teamId,
            teamName: teams.teamName,
            description: teams.description,
            createdBy: teams.createdBy,
            createdAt: teams.createdAt,
            role: teamMembers.role,
            joinedAt: teamMembers.joinedAt
        })
        .from(teamMembers)
        .innerJoin(teams, eq(teamMembers.teamId, teams.teamId))
        .where(eq(teamMembers.userId, userId))

        return userTeams
    },

    // GET USERS TEAM BY ID SERVICE FUNCTION
    async getTeamById(userId: number, teamId: number) {
        // get the team and team member record
        const [[team], [teamMember]] = await Promise.all([
            db
            .select()
            .from(teams)
            .where(eq(teams.teamId, teamId)),

            db
            .select()
            .from(teamMembers)
            .where(and(
                eq(teamMembers.teamId, teamId),
                eq(teamMembers.userId, userId)
            ))
        ])

        // throw error if user is not the member of the team
        if(!team || !teamMember) {
            throw new ApiError(403, "Access Denied")
        }

        return {
            ...team,
            role: teamMember.role,
            joinedAt: teamMember.joinedAt
        }
    },
    
    async updateTeam(userId: number, teamId: number, updates: updateTeamType) {
        // check if the user is the admin
        const [member] = await db
        .select()
        .from(teamMembers)
        .where(and(
            eq(teamMembers.teamId, teamId),
            eq(teamMembers.userId, userId)
        ))

        if(!member || member.role !== 'admin') {
            throw new ApiError(403, "Access Denied")
        }

        await db
        .update(teams)
        .set(updates)
        .where(eq(teams.teamId, teamId))

        return {
            teamId: teamId,
            ...updates
        }
    },

    async deleteTeam(userId: number, teamId: number) {
        // check if the user is the admin
        const [member] = await db
        .select()
        .from(teamMembers)
        .where(and(
            eq(teamMembers.teamId, teamId),
            eq(teamMembers.userId, userId)
        ))

        if(!member || member.role !== 'admin') {
            throw new ApiError(403, "Access Denied")
        }

        await db.transaction(async(tx) => {
            await tx
            .delete(teamMembers)
            .where(eq(teamMembers.teamId, teamId))

            await tx
            .delete(teams)
            .where(eq(teams.teamId, teamId))
        })
    }
}

export const teamMembersServices = {
    async getTeamMembers(userId: number, teamId: number) {
        // check if the user is the admin
        const [isMember] = await db
        .select()
        .from(teamMembers)
        .where(and(
            eq(teamMembers.teamId, teamId),
            eq(teamMembers.userId, userId)
        ))

        if(!isMember) {
            throw new ApiError(403, "Access Denied")
        }

        const members = await db
        .select({
            userId: users.userId,
            name: users.name,
            email: users.email,
            role: teamMembers.role,
            joinedAt: teamMembers.joinedAt
        })
        .from(teamMembers)
        .innerJoin(users, eq(users.userId, teamMembers.userId))
        .where(eq(teamMembers.teamId, teamId))

        return members

    }
}