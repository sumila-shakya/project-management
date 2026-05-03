import { db } from "../config/mysql.config";
import { users, teams, teamMembers, Team, NewTeam, NewTeamMember } from "../models/mysql.model";
import { ApiError } from "../utils/apiError";
import { createTeamType, updateTeamType, updateTeamMemberType } from "../utils/validator";
import { and, count, eq } from "drizzle-orm";

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
    },

    async removeMember(requestingUserId: number, teamId: number, userToRemoveId: number) {
        const [[requestingUser], [userToRemove], [adminCount]] = await Promise.all([
            db.select()
            .from(teamMembers)
            .where(and(
                eq(teamMembers.teamId, teamId),
                eq(teamMembers.userId, requestingUserId)
            )),

            db
            .select()
            .from(teamMembers)
            .where(and(
                eq(teamMembers.teamId, teamId),
                eq(teamMembers.userId, userToRemoveId)
            )),

            db
            .select({
                count: count()
            })
            .from(teamMembers)
            .where(and(
                eq(teamMembers.teamId, teamId),
                eq(teamMembers.role, 'admin')
            ))
        ])

        if(!requestingUser || requestingUser.role !== 'admin') {
            throw new ApiError(403, "Access Denied")
        }

        if(!userToRemove) {
            throw new ApiError(404, "User not found")
        }

        if(adminCount.count === 1 && userToRemove.role === 'admin') {
            throw new ApiError(400, "Cannot remove the only admin")
        }
        
        await db
        .delete(teamMembers)
        .where(and(
            eq(teamMembers.teamId, teamId),
            eq(teamMembers.userId, userToRemoveId)
        ))
    },

    async updateMember(requestingUserId: number, teamId: number, userToUpdateId: number, data: updateTeamMemberType) {
        const [[requestingUser], [userToUpdate], [adminCount]] = await Promise.all([
            db.select()
            .from(teamMembers)
            .where(and(
                eq(teamMembers.teamId, teamId),
                eq(teamMembers.userId, requestingUserId)
            )),

            db
            .select()
            .from(teamMembers)
            .where(and(
                eq(teamMembers.teamId, teamId),
                eq(teamMembers.userId, userToUpdateId)
            )),

            db
            .select({
                count: count()
            })
            .from(teamMembers)
            .where(and(
                eq(teamMembers.teamId, teamId),
                eq(teamMembers.role, 'admin')
            ))
        ])

        if(!requestingUser || requestingUser.role !== 'admin') {
            throw new ApiError(403, "Access Denied")
        }

        if(!userToUpdate) {
            throw new ApiError(404, "User not found")
        }

        if(userToUpdate.role === data.role) {
            throw new ApiError(400, `User already has the role ${userToUpdate.role}`)
        }

        if(adminCount.count === 1 && userToUpdate.role === 'admin') {
            throw new ApiError(400, "Cannot demote the only admin")
        }

        await db
        .update(teamMembers)
        .set({
            'role': data.role
        })
        .where(and(
            eq(teamMembers.teamId, teamId),
            eq(teamMembers.userId, userToUpdateId)
        ))

        return {
            teamId: teamId, 
            userId: userToUpdateId,
            role: data.role
        }
    }
}