import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/apiError";
import { ApiResponse } from "../utils/apiResponse";
import { authServices } from "../services/auth.service";
import { COOKIES_OPTIONS } from "../utils/constants";
import { jwtUtils } from "../utils/jwt";
import { Payload } from "../@types/interface";
import { 
    registrationSchema, loginSchema, changePasswordSchema, updateAccountSchema,
    registrationType, loginType, changePasswordType, updateAccountType } 
from "../utils/validator";

export const authController = {
    async register(req: Request, res: Response, next: NextFunction) {
        try {
            // validate the user data
            const validatedData: registrationType = registrationSchema.parse(req.body)

            // register the new user
            const newUser = await authServices.register(validatedData)

            // seperate the refresh token from the rest of the data
            const {refreshToken, ...data} = newUser

            // send 201 successfully created message
            res.status(201)
            .cookie('refreshToken', refreshToken, COOKIES_OPTIONS)
            .json(new ApiResponse(201, data, "User registered successfully"))

        } catch(error) {
            next(error)
        }
    },

    async login(req: Request, res: Response, next: NextFunction) {
        try {
            // validate the user data
            const validatedData: loginType = loginSchema.parse(req.body)

            // get the user data
            const user = await authServices.login(validatedData)

            // seperate the refresh token from the rest of the data 
            const {refreshToken, ...data} = user

            // send 200 successfully login message
            res.status(200)
            .cookie('refreshToken', refreshToken, COOKIES_OPTIONS)
            .json(new ApiResponse(200, data, "User logged in successfully"))

        } catch(error) {
            next(error)
        }
    },

    async logout(req: Request, res: Response, next: NextFunction) {
        try {
            // get the user id
            const userId = req.user?.userId

            // if the userId is missing throw error
            if(!userId) {
                throw new ApiError(401, "Access Denied")
            }

            // delete the refresh token from the database
            await authServices.logout(userId)

            // cookies option
            const options = {
                httpOnly: true,
                sameSite: "strict" as const
            }

            // send 200 successfully login message
            res.status(200)
            .clearCookie('refreshToken', options)
            .json(new ApiResponse(200, {}, "User logged out successfully"))

        } catch(error) {
            next(error)
        }
    },

    async getAccount(req: Request, res: Response, next: NextFunction) {
        try {
            // get the user id
            const userId = req.user?.userId

            // if the userId is missing throw error
            if(!userId) {
                throw new ApiError(401, "Access Denied")
            }

            // get the user info
            const userInfo = await authServices.getAccount(userId)

            // send the user info
            res
            .status(200)
            .json(new ApiResponse(200, userInfo))

        } catch(error) {
            next(error)
        }
    },

    async refreshToken(req: Request, res: Response, next: NextFunction) {
        try {
            //get refresh token from the cookie
            const token = req.cookies?.refreshToken

            //throw error if token not present
            if(!token) {
                throw new ApiError(401,"Refresh token is required")
            }

            // extract the userId from the refresh token
            const { userId }: Payload = jwtUtils.verifyRefreshToken(token)

            //get the new access and refresh token
            const { accessToken, refreshToken} = await authServices.refreshToken(token, userId)

            // send 200 message
            res.status(200)
            .cookie('refreshToken', refreshToken, COOKIES_OPTIONS)
            .json(new ApiResponse(200, {accessToken}))
        } catch(error) {
            next(error)
        }
    },

    async changePassword(req: Request, res: Response, next: NextFunction) {
        try {
            // get the user id
            const userId = req.user?.userId

            // if the userId is missing throw error
            if(!userId) {
                throw new ApiError(401, "Access Denied")
            }

            // validate the user data
            const validatedData: changePasswordType = changePasswordSchema.parse(req.body)

            const { accessToken, refreshToken} = await authServices.resetPassword(userId, validatedData)

            // send 200 message
            res.status(200)
            .cookie('refreshToken', refreshToken, COOKIES_OPTIONS)
            .json(new ApiResponse(200, {accessToken}, "Successfully password reset"))

        } catch(error) {
            next(error)
        }
    },

    async updateAccount(req: Request, res: Response, next: NextFunction) {
        try {
            // get the user id
            const userId = req.user?.userId

            // if the userId is missing throw error
            if(!userId) {
                throw new ApiError(401, "Access Denied")
            }

            const updates: updateAccountType = updateAccountSchema.parse(req.body)

            if( Object.keys(updates).length === 0 ) {
                throw new ApiError(400, "No data provided for updates")
            }

            const updatedAccount = await authServices.updateAccount(userId, updates)

            res
            .status(200)
            .json(new ApiResponse(200, updatedAccount, "Successfully updated account"))

        } catch(error) {
            next(error)
        }
    }
}