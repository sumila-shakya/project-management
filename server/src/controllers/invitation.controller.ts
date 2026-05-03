import { Request, Response, NextFunction } from "express";
import { invitationSchema, processInvitationSchema, invitationType, processInvitationType } from "../utils/validator";
import { ApiError } from "../utils/apiError";
import { ApiResponse } from "../utils/apiResponse";
import { invitationServices } from "../services/invitation.service";

export const invitationController = {
    // SEND INVITATIONS CONTROLLER FUNCTION
    async sendInvitation(req: Request, res: Response, next: NextFunction) {
        try{
            // get the user id
            const userId = req.user?.userId

            // if the userId is missing throw error
            if(!userId) {
                throw new ApiError(401, "Access Denied")
            }

            // get the teamId from the request params
            const teamId = Number(req.params.teamId)

            //check if the teamId is a actual positive number
            if(isNaN(teamId) || teamId <= 0) {
                throw new ApiError(400, "Invalid teamId")
            }

            // validate the user data
            const validatedData: invitationType = invitationSchema.parse(req.body)

            // send the in app invitation
            const data = await invitationServices.sendInvitation(userId, teamId, validatedData)

            // send 201 success message
            res
            .status(201)
            .json(new ApiResponse(201, data, "Invitation has been send"))
        } catch(error) {
            next(error)
        }
    },

    // GET ALL INVITATIONS CONTROLLER FUNCTION
    async getInvitation(req: Request, res: Response, next: NextFunction) {
        try {
            // get the user id
            const userId = req.user?.userId

            // if the userId is missing throw error
            if(!userId) {
                throw new ApiError(401, "Access Denied")
            }

            // get the user invitations
            const myInvitations = await invitationServices.getInvitations(userId)

            // send 200 success message
            res
            .status(200)
            .json(new ApiResponse(200, myInvitations))
        } catch(error) {
            next(error)
        }
    },

    // PROCESS (ACCEPT/ REJECT) INVITATIONS CONTROLLER FUNCTION
    async processInvitation(req: Request, res: Response, next: NextFunction) {
        try {
            // get the user id
            const userId = req.user?.userId

            // if the userId is missing throw error
            if(!userId) {
                throw new ApiError(401, "Access Denied")
            }

            // get the teamId from the request params
            const invitationId = Number(req.params.invitationId)

            //check if the teamId is a actual positive number
            if(isNaN(invitationId) || invitationId <= 0) {
                throw new ApiError(400, "Invalid invitationId")
            }

            // validate the user data
            const validatedData: processInvitationType = processInvitationSchema.parse(req.body)

            // process the invitation
            await invitationServices.processInvitation(userId, invitationId, validatedData)

            // send 200 success message
            res
            .status(200)
            .json(new ApiResponse(200, {}, "Invitation accepted sucessfully"))
        } catch(error) {
            next(error)
        }
    }
}