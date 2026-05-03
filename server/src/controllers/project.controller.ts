import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/apiError";
import { ApiResponse } from "../utils/apiResponse";
import { projectServices } from "../services/project.service";
import { projectSchema, projectType } from "../utils/validator";

export const projectController = {
    // CREATE PROJECT CONTROLLER FUNCTION
    async createProject(req: Request, res: Response, next: NextFunction) {
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

            // validate the user data
            const validatedData: projectType = projectSchema.parse(req.body)

            // insert the project
            const newProject = await projectServices.createProject(userId, teamId, validatedData)

            res
            .status(201)
            .json(new ApiResponse(201, newProject, "New project created successfully"))
        } catch(error) {
            next(error)
        }
    },

    // GET PROJECTS CONTROLLER FUNCTION
    async getProjects(req: Request, res: Response, next: NextFunction) {
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

            const teamProjects = await projectServices.getProjects(userId, teamId)

            res
            .status(200)
            .json(new ApiResponse(200, teamProjects))
        } catch(error) {
            next(error)
        }
    }
}