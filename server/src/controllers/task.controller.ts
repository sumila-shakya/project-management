import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/apiError";
import { ApiResponse } from "../utils/apiResponse";
import { taskServices } from "../services/task.service";
import { taskSchema, filterProjectsTaskSchema, updateTaskSchema, processTaskSchema, assignTaskSchema,
         taskType, filterProjectsTaskType, updateTaskType, processTaskType, assignTaskType } from "../utils/validator";
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
            // get the user id from the request
            const userId = req.user?.userId
            
            //if not the user id throw error
            if(!userId) {
                throw new ApiError(401, "Access Denied")
            }

            // parse the task id
            const taskId = parseId(req.params.taskId as string)

            const taskDetails = await taskServices.getTaskDetails(userId, taskId)

            res
            .status(200)
            .json(new ApiResponse(200, taskDetails))
        } catch(error) {
            next(error)
        }
    },

    async updateTask(req: Request, res: Response, next: NextFunction) {
        try {
            // get the user id from the request
            const userId = req.user?.userId
            
            //if not the user id throw error
            if(!userId) {
                throw new ApiError(401, "Access Denied")
            }

            // parse the task id
            const taskId = parseId(req.params.taskId as string)

            // get the updates
            const updates: updateTaskType = updateTaskSchema.parse(req.body)

            if(Object.keys(updates).length === 0) {
                throw new ApiError(400, "No data provided for the updates")
            }

            const updateTask = await taskServices.updateTask(userId, taskId, updates)

            res
            .status(200)
            .json(new ApiResponse(200, updateTask, "Task updated successfully"))
        } catch(error) {
            next(error)
        }
    },

    async processTask(req: Request, res: Response, next: NextFunction) {
        try {
            // get the user id from the request
            const userId = req.user?.userId
            
            //if not the user id throw error
            if(!userId) {
                throw new ApiError(401, "Access Denied")
            }

            // parse the task id
            const taskId = parseId(req.params.taskId as string)

            const validatedData: processTaskType = processTaskSchema.parse(req.body)

            await taskServices.processTask(userId, taskId, validatedData)

            res
            .status(200)
            .json(new ApiResponse(200, {}, `task status changed successfully to ${validatedData.taskStatus}`))
        } catch(error) {
            next(error)
        }
    },

    async assignTask(req: Request, res: Response, next: NextFunction) {
        try {
            // get the user id from the request
            const userId = req.user?.userId
            
            //if not the user id throw error
            if(!userId) {
                throw new ApiError(401, "Access Denied")
            }

            // parse the task id
            const taskId = parseId(req.params.taskId as string)

            const validatedData: assignTaskType = assignTaskSchema.parse(req.body)

            await taskServices.assignTask(userId, taskId, validatedData)

            res
            .status(200)
            .json(new ApiResponse(200, {}, `task successfully assigned to ${validatedData.assignedTo}`))
        } catch(error) {
            next(error)
        }
    }
}