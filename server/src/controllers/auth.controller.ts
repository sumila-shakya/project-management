import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/apiError";
import { ApiResponse } from "../utils/apiResponse";
import { registrationSchema, registrationType } from "../utils/validator";
import { authServices } from "../services/auth.service";

export const authController = {
    async register(req: Request, res: Response, next: NextFunction) {
        try {
            const validatedData: registrationType = registrationSchema.parse(req.body)

            const newUser = authServices.register(validatedData)

        } catch(error) {
            next(error)
        }
    }
}