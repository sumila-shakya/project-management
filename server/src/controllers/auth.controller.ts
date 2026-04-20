import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/apiError";
import { ApiResponse } from "../utils/apiResponse";
import { registrationSchema, registrationType } from "../utils/validator";
import { authServices } from "../services/auth.service";

export const authController = {
    async register(req: Request, res: Response, next: NextFunction) {
        try {
            // validate the user data
            const validatedData: registrationType = registrationSchema.parse(req.body)

            // register the new user
            const newUser = await authServices.register(validatedData)

            // seperate the refresh token from the rest of the data
            const {refreshToken, ...data} = newUser

            // cookies options
            const options = {
                httpOnly: true,
                maxAge: 7*24*60*60*1000,
                sameSite: "strict" as const
            }

            // send 201 successfully created message
            res.status(201)
            .cookie('refreshToken', refreshToken, options)
            .json(new ApiResponse(201, data, "User registered successfully"))

        } catch(error) {
            next(error)
        }
    }
}