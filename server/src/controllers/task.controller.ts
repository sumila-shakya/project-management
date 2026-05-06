import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/apiError";
import { ApiResponse } from "../utils/apiResponse";
import { taskServices } from "../services/task.service";
import { taskSchema, filterProjectsTaskSchema, taskType, filterProjectsTaskType } from "../utils/validator";
import { parseId } from "../utils/validateId";

export const taskController = {
    async createTask(req: Request, res: Response, next: NextFunction) {
        try {
            // get the user id from the request
            const userId = req.user?.userId
            
            //if not the user id throw error
            if(!userId) {
                throw new ApiError(401, "Access Denied")
            }
            
            // parse the project id
            const projectId = parseId(req.params.projectId as string)

            const validatedData: taskType = taskSchema.parse(req.body)

            const newTask = await taskServices.createTask(userId, projectId, validatedData)

            res
            .status(201)
            .json(new ApiResponse(201, newTask, "New task created successfully"))
        } catch(error) {
            next(error)
        }
    },

    async getTasks(req: Request, res: Response, next: NextFunction) {
        try {
            // get the user id from the request
            const userId = req.user?.userId
            
            //if not the user id throw error
            if(!userId) {
                throw new ApiError(401, "Access Denied")
            }

            const queryFilter: filterProjectsTaskType = filterProjectsTaskSchema.parse(req.query)

            const userTasks = await taskServices.getTasks(userId, queryFilter)

            res
            .status(200)
            .json(new ApiResponse(200, userTasks))
        } catch(error) {
            next(error)
        }
    },

    async getTasksInProject(req: Request, res: Response, next: NextFunction) {
        try {
            // get the user id from the request
            const userId = req.user?.userId
            
            //if not the user id throw error
            if(!userId) {
                throw new ApiError(401, "Access Denied")
            }
            
            // parse the project id
            const projectId = parseId(req.params.projectId as string)

            const queryFilter: filterProjectsTaskType = filterProjectsTaskSchema.parse(req.query)

            const allTasks = await taskServices.getTasksInProjects(userId, projectId, queryFilter)

            res
            .status(200)
            .json(new ApiResponse(200, allTasks))
        } catch(error) {
            next(error)
        }
    },

    async getTaskDetails(req: Request, res: Response, next: NextFunction) {
        try {

        } catch(error) {
            next(error)
        }
    },
}