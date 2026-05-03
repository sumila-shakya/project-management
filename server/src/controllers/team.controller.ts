import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/apiError";
import { ApiResponse } from "../utils/apiResponse";
import { createTeamSchema, updateTeamSchema, updateTeamMemberSchema, createTeamType, updateTeamType, updateTeamMemberType } from "../utils/validator";
import { teamMembersServices, teamServices } from "../services/team.service";

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
    },

    // UPDATE TEAM CONTROLLER FUNCTION
    async updateTeam(req: Request, res: Response, next: NextFunction) {
        try {
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
            const updates: updateTeamType = updateTeamSchema.parse(req.body)

            // if no data was provided throw error
            if( Object.keys(updates).length === 0 ) {
                throw new ApiError(400, "No data provided for updates")
            }

            // update team
            const data = await teamServices.updateTeam(userId, teamId, updates)

            // send 200 success message
            res
            .status(200)
            .json(new ApiResponse(200, data, "team details updated sucessfully"))
        } catch(error) {
            next(error)
        }
    },

    // DELETE TEAM CONTROLLER FUNCTION
    async deleteTeam(req: Request, res: Response, next: NextFunction) {
        try {
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

            // delete the team
            await teamServices.deleteTeam(userId, teamId)

            // 200 success message 
            res
            .status(200)
            .json(new ApiResponse(200, {}, "team deleted successfully"))
        } catch(error) {
            next(error)
        }
    }
}

export const teamMembersController = {
    // GET TEAM MEMBERS CONTROLLER FUNCTION
    async getTeamMembers(req: Request, res: Response, next:NextFunction) {
        try {
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

            // get the teams members
            const members = await teamMembersServices.getTeamMembers(userId, teamId)

            // send 200 success msg
            res
            .status(200)
            .json(new ApiResponse(200, members))
        } catch(error) {
            next(error)
        }
    },

    // REMOVE TEAM MEMBERS CONTROLLER FUNCTION
    async removeMember(req: Request, res: Response, next: NextFunction) {
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

            // get the teamId from the request params
            const memberId = Number(req.params.memberId)

            //check if the teamId is a actual positive number
            if(isNaN(memberId) || memberId <= 0) {
                throw new ApiError(400, "Invalid memberId")
            }

            // remove the team members
            await teamMembersServices.removeMember(userId, teamId, memberId)

            // 200 success message
            res
            .status(200)
            .json(new ApiResponse(200, {}, "User removed from the team successfully"))
        } catch(error) {
            next(error)
        }
    },

    // UPDATE TEAM MEMBERS CONTROLLER FUNCTION
    async updateMember(req: Request, res: Response, next: NextFunction) {
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

            // get the teamId from the request params
            const memberId = Number(req.params.memberId)

            //check if the teamId is a actual positive number
            if(isNaN(memberId) || memberId <= 0) {
                throw new ApiError(400, "Invalid memberId")
            }

            // validate the user data
            const validatedData: updateTeamMemberType = updateTeamMemberSchema.parse(req.body)

            // update team members
            const updatedMember = await teamMembersServices.updateMember(userId, teamId, memberId, validatedData)

            // 200 success message
            res
            .status(200)
            .json(new ApiResponse(300, updatedMember, "Member updated successfully"))
        } catch(error) {
            next(error)
        }
    }
}