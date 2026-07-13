import { db } from "../config/mysql.config";
import { AnalyticsLog } from "../models/mongodb.model";
import { users, teams, teamMembers, tasks, projects, Team, NewTeam, NewTeamMember } from "../models/mysql.model";
import { ApiError } from "../utils/apiError";
import { createTeamType, updateTeamType, updateTeamMemberType, filterAnalyticsLogType } from "../validator/team.validator";
import { paginationType } from "../validator/global.validator";
import { and, asc, count, eq } from "drizzle-orm";
import { DEFAULT_PAGE_LIMIT } from "../utils/constants";
import { encodeLogCursor, decodeLogCursor } from "../utils/cursor";
import { LogCursor, CursorPageMetaData, NotificationType } from "../@types/interface";
import { notificationEmitter } from "../events/notification.events";
import mongoose from "mongoose";

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
    async getTeams(userId: number, paginationData: paginationType) {
        // get the pagination data
        const page = paginationData.page || 1
        const limit = paginationData.limit || DEFAULT_PAGE_LIMIT
        const offset = (page - 1)*limit

        // get all the teams where user is member
        const [userTeams, [teamCount]] = await Promise.all([
            db
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
            .orderBy(asc(teams.teamId))
            .offset(offset)
            .limit(limit),

            db
            .select({
                total: count()
            })
            .from(teamMembers)
            .where(eq(teamMembers.userId, userId))
        ])

        return {
            paginationInfo: {
                totalTeamCount: teamCount.total,
                totalPages: Math.ceil(teamCount.total/limit),
                page: page,
                limit: limit
            },
            userTeams
        }
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
    
    // UPDATE TEAM SERVICE FUNCTION
    async updateTeam(userId: number, teamId: number, updates: updateTeamType) {
        // check if the user is the admin
        const [member] = await db
        .select({
            teamName: teams.teamName,
            userName: users.name,
            role: teamMembers.role,
        })
        .from(teamMembers)
        .innerJoin(users, eq(teamMembers.userId, users.userId))
        .innerJoin(teams, eq(teamMembers.teamId, teams.teamId))
        .where(and(
            eq(teamMembers.teamId, teamId),
            eq(teamMembers.userId, userId)
        ))

        // if the user is not admi throw the error
        if(!member || member.role !== 'admin') {
            throw new ApiError(403, "Access Denied")
        }

        // update the team
        await db
        .update(teams)
        .set(updates)
        .where(eq(teams.teamId, teamId))

        /* ------------------------------------ notification ------------------------------------ */
                
        const allTeamMembers = await teamMembersServices.getTeamMembersIds(teamId)
        const recipients = allTeamMembers.filter((memberId) => memberId !== userId)
        const message = `User [${member.userName}](${userId}) updated the team [${member.teamName}](${teamId})`
        const notificationType: NotificationType = 'team_updated'
                
        if(recipients.length > 0) {
            notificationEmitter.emit('notification_generated', notificationType, message, recipients)
        }
                
        /* ------------------------------------ notification ------------------------------------ */

        return {
            teamId: teamId,
            ...updates
        }
    },

    // DELETE TEAM SERVICE FUNCTION
    async deleteTeam(userId: number, teamId: number) {
        // check if the user is the admin
        const [member] = await db
        .select()
        .from(teamMembers)
        .where(and(
            eq(teamMembers.teamId, teamId),
            eq(teamMembers.userId, userId)
        ))

        // if the user is not the admin throw error
        if(!member || member.role !== 'admin') {
            throw new ApiError(403, "Access Denied")
        }

        await db.transaction(async(tx) => {
            // delete the team members record
            await tx
            .delete(teamMembers)
            .where(eq(teamMembers.teamId, teamId))

            // delete the team itself
            await tx
            .delete(teams)
            .where(eq(teams.teamId, teamId))
        })

        // delete the team log
        await AnalyticsLog.deleteMany({
            "team.teamId": String(teamId)
        })
    },

    // GET ANALYTICS LOG SERVICE FUNCTION
    async getAnalyticsLog(userId: number, teamId: number, filters: filterAnalyticsLogType,) {
        // get the limit
        const limit = filters.limit || DEFAULT_PAGE_LIMIT

        // construct the cursor based pagination meta data
        const pageMetaData: CursorPageMetaData = {
            nextPage: false,
            limit: limit
        }
        
        // check if the user is the member
        const [member] = await db
        .select()
        .from(teamMembers)
        .where(and(
            eq(teamMembers.teamId, teamId),
            eq(teamMembers.userId, userId)
        ))

        // throw error if user is not the member
        if(!member) {
            throw new ApiError(403, "Access Denied")
        }

        // get the filters
        const queryFilters: Record<string, any> = {}
        queryFilters['team.teamId'] = String(teamId)
        if(filters.action) queryFilters['action'] = filters.action
        if(filters.taskId) queryFilters['target.taskId'] = String(filters.taskId)
        if(filters.userId) queryFilters['actor.userId'] = String(filters.userId)
        if(filters.projectId) queryFilters['project.projectId'] = String(filters.projectId)
        if(filters.role) queryFilters['actor.role'] = filters.role

        if(filters.cursor) {
            // decode the cursor
            const cursorDate: LogCursor = decodeLogCursor(filters.cursor)

            // push the cursor based filter into the queryfilters
            queryFilters['$or'] = [
                {'timestamp': {$lt: cursorDate.timestamp}},
                {$and: [
                    {'timestamp': cursorDate.timestamp},
                    {'_id': {$lt: new mongoose.Types.ObjectId(cursorDate._id)}}
                ]}
            ]
        }

        // get the analytics log
        const logs = await AnalyticsLog
        .find(queryFilters)
        .sort({ timestamp: -1, _id: -1 })
        .limit(limit+1)
        .lean()

        if(logs.length > limit) {
            // generate new nursor if next page exists
            const nextCursorData: LogCursor = {
                timestamp: logs[limit-1].timestamp,
                _id: String(logs[limit-1]._id)
            }

            // encode the cursor
            const nextCursor: string = encodeLogCursor(nextCursorData)

            // update the pagination meta data
            pageMetaData.nextPage = true
            pageMetaData.nextCursor = nextCursor
        }

        // grab only the current page data
        const currentPageData = pageMetaData.nextPage ? logs.slice(0,limit) : logs

        return {
            pageMetaData,
            currentPageData
        }
    }
}

export const teamMembersServices = {
    // GET TEAM MEMBERS SERVICE FUNCTION
    async getTeamMembers(userId: number, teamId: number, paginationData: paginationType) {
        // get the pagination data
        const page = paginationData.page || 1
        const limit = paginationData.limit || DEFAULT_PAGE_LIMIT
        const offset = (page - 1)*limit

        // check if the user is the admin
        const [isMember] = await db
        .select()
        .from(teamMembers)
        .where(and(
            eq(teamMembers.teamId, teamId),
            eq(teamMembers.userId, userId)
        ))

        // if the user is not the member of the team throw the error
        if(!isMember) {
            throw new ApiError(403, "Access Denied")
        }

        const [members, [memberCount]] = await Promise.all([
            // get all the team members
            db
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
            .offset(offset)
            .limit(limit),

            db
            .select({
                total: count()
            })
            .from(teamMembers)
            .where(eq(teamMembers.teamId, teamId))
        ])

        return {
            paginationInfo: {
                totalTeamCount: memberCount.total,
                totalPages: Math.ceil(memberCount.total/limit),
                page: page,
                limit: limit
            },
            members
        }
    },

    // REMOVE TEAM  MEMBERS SERVICE FUNCTION
    async removeMember(requestingUserId: number, teamId: number, userToRemoveId: number) {
        const [[requestingUser], [userToRemove], [adminCount]] = await Promise.all([
            // grab information on requesting user
            db.select({
                userName: users.name,
                role: teamMembers.role
            })
            .from(teamMembers)
            .innerJoin(users, eq(teamMembers.userId, users.userId))
            .where(and(
                eq(teamMembers.teamId, teamId),
                eq(teamMembers.userId, requestingUserId)
            )),

            // grab information on user to remove
            db
            .select({
                userName: users.name,
                role: teamMembers.role
            })
            .from(teamMembers)
            .innerJoin(users, eq(teamMembers.userId, users.userId))
            .where(and(
                eq(teamMembers.teamId, teamId),
                eq(teamMembers.userId, userToRemoveId)
            )),

            // get the no. of admins
            db
            .select({
                teamName: teams.teamName,
                count: count()
            })
            .from(teamMembers)
            .innerJoin(teams, eq(teamMembers.teamId, teams.teamId))
            .where(and(
                eq(teamMembers.teamId, teamId),
                eq(teamMembers.role, 'admin')
            ))
        ])

        // if the user is not the admin throw error
        if(!requestingUser || requestingUser.role !== 'admin') {
            throw new ApiError(403, "Access Denied")
        }

        // if the user to remove is not found throw the error
        if(!userToRemove) {
            throw new ApiError(404, "User not found")
        }

        // if only one admin is left do not allow to remove the admin
        if(adminCount.count === 1 && userToRemove.role === 'admin') {
            throw new ApiError(400, "Cannot remove the only admin")
        }
        
        // remove the user from the team
        await db
        .delete(teamMembers)
        .where(and(
            eq(teamMembers.teamId, teamId),
            eq(teamMembers.userId, userToRemoveId)
        ))

        /* ------------------------------------ notification ------------------------------------ */
                
        const allTeamMembers = await teamMembersServices.getTeamMembersIds(teamId)
        const recipients = allTeamMembers.filter((memberId) => memberId !== requestingUserId && memberId !== userToRemoveId)
        const generalMessage = `User [${requestingUser.userName}](${requestingUserId}) removed the member [${userToRemove.userName}](${userToRemoveId}) from the team [${adminCount.teamName}](${teamId})`
        const message = `User [${requestingUser.userName}](${requestingUserId}) removed you from the team [${adminCount.teamName}](${teamId})`
        const notificationType: NotificationType = 'team_member_removed'
                
        if(recipients.length > 0) {
            notificationEmitter.emit('notification_generated', notificationType, generalMessage, recipients)
        }
        notificationEmitter.emit('notification_generated', notificationType, message, [userToRemove])
                
                
        /* ------------------------------------ notification ------------------------------------ */
    },

    // UPDATE TEAM MEMBERS SERVICE FUNCTION
    async updateMember(requestingUserId: number, teamId: number, userToUpdateId: number, data: updateTeamMemberType) {
        const [[requestingUser], [userToUpdate], [adminCount]] = await Promise.all([
            // grab information on requesting user
            db.select({
                userName: users.name,
                role: teamMembers.role
            })
            .from(teamMembers)
            .innerJoin(users, eq(teamMembers.userId, users.userId))
            .where(and(
                eq(teamMembers.teamId, teamId),
                eq(teamMembers.userId, requestingUserId)
            )),

            // grab information on user to update
            db
            .select({
                userName: users.name,
                role: teamMembers.role
            })
            .from(teamMembers)
            .innerJoin(users, eq(teamMembers.userId, users.userId))
            .where(and(
                eq(teamMembers.teamId, teamId),
                eq(teamMembers.userId, userToUpdateId)
            )),

            // get the no. of admin
            db
            .select({
                teamName: teams.teamName,
                count: count()
            })
            .from(teamMembers)
            .innerJoin(teams, eq(teamMembers.teamId, teams.teamId))
            .where(and(
                eq(teamMembers.teamId, teamId),
                eq(teamMembers.role, 'admin')
            ))
        ])

        // if the user is not the admin throw error
        if(!requestingUser || requestingUser.role !== 'admin') {
            throw new ApiError(403, "Access Denied")
        }

        // if the user to update is not found throw the error
        if(!userToUpdate) {
            throw new ApiError(404, "User not found")
        }

        // if the user has the same role as the update throw error
        if(userToUpdate.role === data.role) {
            throw new ApiError(400, `User already has the role ${userToUpdate.role}`)
        }

        // do not allow to demote the only admin
        if(adminCount.count === 1 && userToUpdate.role === 'admin') {
            throw new ApiError(400, "Cannot demote the only admin")
        }

        // update the team member role
        await db
        .update(teamMembers)
        .set({
            'role': data.role
        })
        .where(and(
            eq(teamMembers.teamId, teamId),
            eq(teamMembers.userId, userToUpdateId)
        ))

        /* ------------------------------------ notification ------------------------------------ */
                
        const allTeamMembers = await teamMembersServices.getTeamMembersIds(teamId)
        const recipients = allTeamMembers.filter((memberId) => memberId !== requestingUserId && memberId !== userToUpdateId)
        const generalMessage = `User [${requestingUser.userName}](${requestingUserId}) changed the role of the member [${userToUpdate.userName}](${userToUpdateId}) in the team [${adminCount.teamName}](${teamId})`
        const message = `User [${requestingUser.userName}](${requestingUserId}) changed your role in the team [${adminCount.teamName}](${teamId})`
        const notificationType: NotificationType = 'role_updated'
                
        if(recipients.length > 0) {
            notificationEmitter.emit('notification_generated', notificationType, generalMessage, recipients)
        }
        notificationEmitter.emit('notification_generated', notificationType, message, [userToUpdateId])
                
                
        /* ------------------------------------ notification ------------------------------------ */

        return {
            teamId: teamId, 
            userId: userToUpdateId,
            role: data.role
        }
    },

    async getTeamMembersIds(teamId: number) {
        const members = await db
        .select()
        .from(teamMembers)
        .where(eq(teamMembers.teamId, teamId))

        const memberIds = members.map((member) => member.userId)

        return memberIds
    }
}