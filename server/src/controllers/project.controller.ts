import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/apiError";
import { ApiResponse } from "../utils/apiResponse";
import { projectServices } from "../services/project.service";
import { projectSchema, updateProjectSchema, filterProjectSchema, projectType, updateProjectType, filterProjectType } from "../utils/validator";
import { parseId } from "../utils/validateId";

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
            const teamId = parseId(req.params.teamId as string)

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
            const teamId = parseId(req.params.teamId as string)

            const filter: filterProjectType = filterProjectSchema.parse(req.query)

            const teamProjects = await projectServices.getProjects(userId, teamId, filter)

            res
            .status(200)
            .json(new ApiResponse(200, teamProjects))
        } catch(error) {
            next(error)
        }
    },

    async getProjectDetails(req: Request, res: Response, next: NextFunction) {
        try {
            // get the user id from the request
            const userId = req.user?.userId

            //if not the user id throw error
            if(!userId) {
                throw new ApiError(401, "Access Denied")
            }

            const projectId = parseId(req.params.projectId as string)

            const projectDetails = await projectServices.getProjectDetails(userId, projectId)

            res
            .status(200)
            .json(new ApiResponse(200, projectDetails))
        } catch(error) {
            next(error)
        }
    },

    async updateProject(req: Request, res: Response, next: NextFunction) {
        try {
            // get the user id from the request
            const userId = req.user?.userId

            //if not the user id throw error
            if(!userId) {
                throw new ApiError(401, "Access Denied")
            }

            // get the projectId from the request params
            const projectId = parseId(req.params.projectId as string)

            const updates: updateProjectType = updateProjectSchema.parse(req.body)

            if(Object.keys(updates).length === 0) {
                throw new ApiError(400, "No updates provided for the project")
            }

            const updatedProject = await projectServices.updateProject(userId, projectId, updates)

            res
            .status(200)
            .json(new ApiResponse(200, updatedProject, "Project updated successfully"))
        } catch(error) {
            next(error)
        }
    },

    async archiveProject(req: Request, res: Response, next: NextFunction) {
        try {
            // get the user id from the request
            const userId = req.user?.userId

            //if not the user id throw error
            if(!userId) {
                throw new ApiError(401, "Access Denied")
            }

            // get the projectId from the request params
            const projectId = parseId(req.params.projectId as string)

            await projectServices.archiveProject(userId, projectId)

            res
            .status(200)
            .json(new ApiResponse(200, {}, "Project archived successfully"))
        } catch(error) {
            next(error)
        }
    },
    
    async restoreProject(req: Request, res: Response, next: NextFunction) {
        try {
            // get the user id from the request
            const userId = req.user?.userId

            //if not the user id throw error
            if(!userId) {
                throw new ApiError(401, "Access Denied")
            }

            // get the projectId from the request params
            const projectId = parseId(req.params.projectId as string)

            const restoredProject = await projectServices.restoreProject(userId, projectId)

            res
            .status(200)
            .json(new ApiResponse(200, restoredProject, "Project restored successfully"))
        } catch(error) {
            next(error)
        }
    },

    async deleteProject(req: Request, res: Response, next: NextFunction) {
        try {
            // get the user id from the request
            const userId = req.user?.userId

            //if not the user id throw error
            if(!userId) {
                throw new ApiError(401, "Access Denied")
            }

            // get the projectId from the request params
            const projectId = parseId(req.params.projectId as string)

            await projectServices.deleteProject(userId, projectId)

            res
            .status(200)
            .json(new ApiResponse(200, {}, "Project deleted successfully"))
        } catch(error) {
            next(error)
        }
    }
}