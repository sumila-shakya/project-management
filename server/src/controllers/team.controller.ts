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
    },

    // GET USER TEAMS CONTROLLER FUNCTION
    async getTeams(req: Request, res:Response, next: NextFunction) {
        try {
            // get the user id from the request
            const userId = req.user?.userId

            //if not the user id throw error
            if(!userId) {
                throw new ApiError(401, "Access Denied")
            }

            // get the user teams
            const userTeams = await teamServices.getTeams(userId)

            //send 200 success
            res
            .status(200)
            .json(new ApiResponse(200, userTeams))
        } catch(error) {
            next(error)
        }
    },

    // GET USER TEAM BY ID CONTROLLER FUNCTION
    async getTeamsById(req: Request, res: Response, next: NextFunction) {
        try {
            // get the user id from the request
            const userId = req.user?.userId

            //if not the user id throw error
            if(!userId) {
                throw new ApiError(401, "Access Denied")
            }

            // get the teamId from the request params
            const teamId = Number(req.params.teamId)

            //check if the teamId is a actual positive number
            if(isNaN(teamId) || teamId <= 0) {
                throw new ApiError(400, "Invalid teamId")
            }

            // get the team info
            const teamInfo = await teamServices.getTeamById(userId, teamId)

            //send 200 success
            res
            .status(200)
            .json(new ApiResponse(200, teamInfo))
        } catch(error) {
            next(error)
        }
    }
}