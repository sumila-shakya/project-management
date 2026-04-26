import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/apiError";
import { ApiResponse } from "../utils/apiResponse";
import { createTeamSchema, createTeamType } from "../utils/validator";
import { teamServices } from "../services/team.service";

export const teamController = {
    // CREATE TEAM CONTROLLER FUNCTION
    async createTeam(req: Request, res: Response, next: NextFunction) {
        try {
            // get the user id from the request
            const userId = req.user?.userId

            //if not the user id throw error
            if(!userId) {
                throw new ApiError(401, "Access Denied")
            }

            //validate the user data
            const validatedData: createTeamType = createTeamSchema.parse(req.body)

            //get the new team data
            const teamInfo = await teamServices.createTeam(userId, validatedData)

            //send the 201 success message
            res
            .status(201)
            .json(new ApiResponse(201, teamInfo, "Successfully new team created"))
        } catch(error) {
            next(error)
        }
    }
}