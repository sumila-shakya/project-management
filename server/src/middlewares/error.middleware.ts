import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/apiError";
import { ZodError } from "zod";

export const errorHandler = (
    err:any, 
    req: Request, 
    res: Response, 
    next: NextFunction) => {

    let error = err

    //handle zod error
    if(error instanceof ZodError) {
        error = new ApiError(400, "Input Validation Failed !!", error.issues)
    }

    //handling non ApiError
    else if(!(error instanceof ApiError)) {
        const statusCode: number = error.statusCode || 500
        const message: string = error.message || "Internal Server Error"
        error = new ApiError(statusCode, message)
    }

    //generate the response to send
    const response = {
        success: error.success,
        statusCode: error.statusCode,
        message: error.message,
        errors: error.errors
    }

    res
    .status(error.statusCode)
    .json(response)
}