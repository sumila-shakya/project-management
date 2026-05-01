import { db } from "../config/mysql.config";
import { users, teams, teamMembers, invitations, NewInvitation, Invitation, NewTeamMember } from "../models/mysql.model";
import { invitationType, processInvitationType } from "../utils/validator";
import { generateToken, hashToken } from "../utils/token";
import { and, eq} from "drizzle-orm";
import { ApiError } from "../utils/apiError";

export const invitationServices = {
    async sendInvitation(senderId: number, teamId: number, data: invitationType) {
        const [[userToInvite], [senderMembership]] = await Promise.all([
            db
            .select()
            .from(users)
            .where(eq(users.userId, data.inviteeId)),

            db
            .select()
            .from(teamMembers)
            .where(and(
                eq(teamMembers.teamId, teamId),
                eq(teamMembers.userId, senderId)
            ))
        ])

        if(!userToInvite) {
            throw new ApiError(404, "User not found")
        }

        if(!senderMembership || senderMembership.role !== 'admin') {
            throw new ApiError(403, "Access Denied")
        }

        const [[isMember], [existingInvitation]] = await Promise.all([
            db.select()
            .from(teamMembers)
            .where(and(
                eq(teamMembers.teamId, teamId),
                eq(teamMembers.userId, userToInvite.userId)
            )),
            
            db
            .select()
            .from(invitations)
            .where(and(
                eq(invitations.inviteeId, userToInvite.userId),
                eq(invitations.teamId, teamId)
            ))
        ])

        if(isMember) {
            throw new ApiError(400, "User is already the member of the team")
        }

        if(existingInvitation && existingInvitation.expiresAt > new Date()) {
            throw new ApiError(400, "Invitation already send")
        }

        const token: string = generateToken()
        const newInvitation: NewInvitation = {
            inviteeId: userToInvite.userId,
            teamId: teamId,
            token: token,
            expiresAt: new Date(Date.now() + 7*24*60*60*1000),
            invitedBy: senderId
        }

        await db
        .delete(invitations)
        .where(and(
            eq(invitations.inviteeId, userToInvite.userId),
            eq(invitations.teamId, teamId)
        ))

        const [result] = await db
        .insert(invitations)
        .values(newInvitation)
        
        return {
            invitationId: result.insertId,
            email: userToInvite.email,
            teamId: teamId,
            invitedBy: senderId
        }
    },

    async getInvitations(userId: number) {

        const myInvitations = await db
        .select({
            invitationId: invitations.invitationId,
            teamId: invitations.teamId,
            teamName: teams.teamName,
            description: teams.description,
            invitedBy: invitations.invitedBy,
            invitorName: users.name,
            token: invitations.token,
            invitationStatus: invitations.invitationStatus,
            createdBy: invitations.createdAt,
            expiresAt: invitations.expiresAt,
        })
        .from(invitations)
        .innerJoin(teams, eq(invitations.teamId, teams.teamId))
        .innerJoin(users, eq(invitations.invitedBy, users.userId))
        .where(eq(invitations.inviteeId, userId))

        return myInvitations
    },

    async processInvitation(userId: number, invitationId: number, data: processInvitationType) {
        const [userInvitation] = await db
        .select()
        .from(invitations)
        .where(and(
            eq(invitations.invitationId, invitationId),
            eq(invitations.inviteeId, userId)
        ))

        if(!userInvitation) {
            throw new ApiError(403, "Access Denied")
        }

        if(userInvitation.token !== data.token) {
            throw new ApiError(400, "Invalid token")
        }

        if(userInvitation.expiresAt < new Date()) {
            //delete the expired invitation ??
            throw new ApiError(400, "Invitation expired")
        }

        if(userInvitation.invitationStatus !== 'pending') {
            throw new ApiError(400, `Cannot process ${userInvitation.invitationStatus} invitation`)
        }

        await db.transaction(async(tx) => {
            await tx
            .update(invitations)
            .set({
                invitationStatus: data.action
            })
            .where(eq(invitations.invitationId, invitationId))

            if(data.action === 'accepted') {
                const newMember: NewTeamMember = {
                    teamId: userInvitation.teamId,
                    userId: userId,
                    role: 'member'
                }

                await tx
                .insert(teamMembers)
                .values(newMember)
            }
        })
    }
}