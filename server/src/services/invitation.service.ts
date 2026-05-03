import { db } from "../config/mysql.config";
import { users, teams, teamMembers, invitations, NewInvitation, NewTeamMember } from "../models/mysql.model";
import { invitationType, processInvitationType } from "../utils/validator";
import { generateToken, hashToken } from "../utils/token";
import { and, eq} from "drizzle-orm";
import { ApiError } from "../utils/apiError";

export const invitationServices = {
    // SEND INVITATIONS SERVICE FUNCTION
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

        // if the user to invite is not found throw the error
        if(!userToInvite) {
            throw new ApiError(404, "User not found")
        }

        // throw error if the sender is not the admin of the team
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

        // throw if the user of invite is already the member of the team
        if(isMember) {
            throw new ApiError(400, "User is already the member of the team")
        }

        // if the invitation was send and has not expired yet throw error
        if(existingInvitation && existingInvitation.expiresAt > new Date()) {
            throw new ApiError(400, "Invitation already send")
        }

        // generate the invitation token
        const token: string = generateToken()

        const newInvitation: NewInvitation = {
            inviteeId: userToInvite.userId,
            teamId: teamId,
            token: token,
            expiresAt: new Date(Date.now() + 7*24*60*60*1000),
            invitedBy: senderId
        }

        // delete the old invitations
        await db
        .delete(invitations)
        .where(and(
            eq(invitations.inviteeId, userToInvite.userId),
            eq(invitations.teamId, teamId)
        ))

        // insert the new invitation into the database
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

    // GET INVITATIONS SERVICE FUNCTION
    async getInvitations(userId: number) {
        // get all the users invitations
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

    // PROCESS INVITATION SERVICE FUNCTION
    async processInvitation(userId: number, invitationId: number, data: processInvitationType) {
        const [userInvitation] = await db
        .select()
        .from(invitations)
        .where(and(
            eq(invitations.invitationId, invitationId),
            eq(invitations.inviteeId, userId)
        ))

        // throw error if the user is not the member of the team
        if(!userInvitation) {
            throw new ApiError(403, "Access Denied")
        }

        // if the token provided if not valid throw error
        if(userInvitation.token !== data.token) {
            throw new ApiError(400, "Invalid token")
        }

        // throw error if the invitation expires
        if(userInvitation.expiresAt < new Date()) {
            // delete the expired invitations
            await db
            .delete(invitations)
            .where(and(
                eq(invitations.inviteeId, userId),
                eq(invitations.invitationId, invitationId)
            ))
            throw new ApiError(400, "Invitation expired")
        }

        // if the invitation is already process throw error
        if(userInvitation.invitationStatus !== 'pending') {
            throw new ApiError(400, `Cannot process ${userInvitation.invitationStatus} invitation`)
        }

        await db.transaction(async(tx) => {
            // update the invitation status
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

                // join the new team
                await tx
                .insert(teamMembers)
                .values(newMember)
            }
        })
    }
}