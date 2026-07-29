import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/apiError";
import { ApiResponse } from "../utils/apiResponse";
import { taskServices } from "../services/task.service";
import { taskSchema, filterTaskSchema, updateTaskSchema, processTaskSchema, assignTaskSchema,
         taskType, filterTaskType, updateTaskType, processTaskType, assignTaskType } from "../validator/task.validator";
import { paginationSchema, paginationType } from "../validator/global.validator";
import { parseId } from "../utils/validate-id";

export const taskController = {
    // CREATE TASK CONTROLLER FUNCTION
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

            // validating the user data
            const validatedData: taskType = taskSchema.parse(req.body)

            // creating a new task
            const newTask = await taskServices.createTask(userId, projectId, validatedData)

            // sending 201 success msg
            res
            .status(201)
            .json(new ApiResponse(201, newTask, "New task created successfully"))
        } catch(error) {
            next(error)
        }
    },

    // GET USER TASKS CONTROLLER FUNCTION
    async getMyTasks(req: Request, res: Response, next: NextFunction) {
        try {
            // get the user id from the request
            const userId = req.user?.userId
            
            // if not the user id throw error
            if(!userId) {
                throw new ApiError(401, "Access Denied")
            }

            // validate the user data
            const queryFilter: filterTaskType = filterTaskSchema.parse(req.query)

            // get all user tasks
            const userTasks = await taskServices.getMyTasks(userId, queryFilter)

            // send 200 success msg
            res
            .status(200)
            .json(new ApiResponse(200, userTasks))
        } catch(error) {
            next(error)
        }
    },

    // GET TASKS IN PROJECT CONTROLLER FUNCTION
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

            // validate the user data
            const queryFilter: filterTaskType = filterTaskSchema.parse(req.query)

            // get the filtered data
            const allTasks = await taskServices.getTasksInProjects(userId, projectId, queryFilter)

            // send 200 success msg
            res
            .status(200)
            .json(new ApiResponse(200, allTasks))
        } catch(error) {
            next(error)
        }
    },

    // GET TASK DETAILS CONTROLLER FUNCTION
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

            // get the task details
            const taskDetails = await taskServices.getTaskDetails(userId, taskId)

            // send 200 success msg
            res
            .status(200)
            .json(new ApiResponse(200, taskDetails))
        } catch(error) {
            next(error)
        }
    },

    // UPDATE TASK CONTROLLER FUNCTION
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

            // throw error if no data was provided for updates
            if(Object.keys(updates).length === 0) {
                throw new ApiError(400, "No data provided for the updates")
            }

            // get the updated task
            const updateTask = await taskServices.updateTask(userId, taskId, updates)

            // send 200 success msg
            res
            .status(200)
            .json(new ApiResponse(200, updateTask, "Task updated successfully"))
        } catch(error) {
            next(error)
        }
    },

    // PROGRESS TASK CONTROLLER FUNCTION
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

            // validate the data
            const validatedData: processTaskType = processTaskSchema.parse(req.body)

            // process the task
            await taskServices.processTask(userId, taskId, validatedData)

            // send 200 success msg
            res
            .status(200)
            .json(new ApiResponse(200, {}, `task status changed successfully to ${validatedData.taskStatus}`))
        } catch(error) {
            next(error)
        }
    },

    // ASSIGN TASK CONTROLLER FUNCTION
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

            // validate the user data
            const validatedData: assignTaskType = assignTaskSchema.parse(req.body)

            // assign the task
            await taskServices.assignTask(userId, taskId, validatedData)

            // send 200 success msg
            res
            .status(200)
            .json(new ApiResponse(200, {}, `task successfully assigned to ${validatedData.assignedTo}`))
        } catch(error) {
            next(error)
        }
    },

    // GET SUB TASKS CONTROLLER FUNCTION
    async getSubTasks(req: Request, res: Response, next: NextFunction) {
        try {
             // get the user id from the request
            const userId = req.user?.userId
            
            //if not the user id throw error
            if(!userId) {
                throw new ApiError(401, "Access Denied")
            }

            // parse the task id
            const taskId = parseId(req.params.taskId as string)

            // get the pagination data
            const paginationData: paginationType = paginationSchema.parse(req.query)

            // get the sub tasks
            const subTasks = await taskServices.getSubTasks(userId, taskId, paginationData)

            // send 200 success msg
            res
            .status(200)
            .json(new ApiResponse(200, subTasks))
        } catch(error) {
            next(error)
        }
    },

    // DELETE TASK CONTROLLER FUNCTION
    async deleteTask(req: Request, res: Response, next: NextFunction) {
        try {
            // get the user id from the request
            const userId = req.user?.userId

            //if not the user id throw error
            if(!userId) {
                throw new ApiError(401, "Access Denied")
            }

            // get the taskId from the request params
            const taskId = parseId(req.params.taskId as string)

            // delete task
            await taskServices.deleteTask(userId, taskId)

            // send 200 success msg
            res
            .status(200)
            .json(new ApiResponse(200, {}, "Task deleted successfully"))
        } catch(error) {
            next(error)
        }
    }
}