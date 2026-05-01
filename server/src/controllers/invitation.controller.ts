import { Request, Response, NextFunction } from "express";
import { invitationSchema, processInvitationSchema, invitationType, processInvitationType } from "../utils/validator";
import { ApiError } from "../utils/apiError";
import { ApiResponse } from "../utils/apiResponse";
import { invitationServices } from "../services/invitation.service";

export const invitationController = {
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

            const validatedData: invitationType = invitationSchema.parse(req.body)

            const data = await invitationServices.sendInvitation(userId, teamId, validatedData)

            res
            .status(201)
            .json(new ApiResponse(201, data, "Invitation has been send"))
        } catch(error) {
            next(error)
        }
    },

    async getInvitation(req: Request, res: Response, next: NextFunction) {
        try {
            // get the user id
            const userId = req.user?.userId

            // if the userId is missing throw error
            if(!userId) {
                throw new ApiError(401, "Access Denied")
            }

            const myInvitations = await invitationServices.getInvitations(userId)

            res
            .status(200)
            .json(new ApiResponse(200, myInvitations))
        } catch(error) {
            next(error)
        }
    },

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

            const validatedData: processInvitationType = processInvitationSchema.parse(req.body)

            await invitationServices.processInvitation(userId, invitationId, validatedData)

            res
            .status(200)
            .json(new ApiResponse(200, {}, "Invitation accepted sucessfully"))
        } catch(error) {
            next(error)
        }
    }
}