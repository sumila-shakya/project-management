import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/apiError";
import { ApiResponse } from "../utils/apiResponse";
import { authServices } from "../services/auth.service";
import { COOKIES_OPTIONS } from "../utils/constants";
import { jwtUtils } from "../utils/jwt";
import { Payload } from "../@types/interface";
import { 
    registrationSchema, loginSchema, changePasswordSchema, updateAccountSchema, forgetPasswordSchema, resetPasswordSchema, emailVerificationSchema, requestVerificationSchema,
    registrationType, loginType, changePasswordType, updateAccountType, forgetPasswordType, resetPasswordType, emailVerificationType, requestVerificationType } 
from "../utils/validator";

export const authController = {
    // USER REGISTRATION CONTROLLER FUNCTION
    async register(req: Request, res: Response, next: NextFunction) {
        try {
            // validate the user data
            const validatedData: registrationType = registrationSchema.parse(req.body)

            // register the new user
            const newUser = await authServices.register(validatedData)

            // send 201 successfully created message
            res
            .status(201)
            .json(new ApiResponse(201, newUser, "User registered successfully, Please, verify your email"))

        } catch(error) {
            next(error)
        }
    },

    // EMAIL VERIFICATION CONTROLLER FUNCTION
    async verifyEmail(req: Request, res: Response, next: NextFunction) {
        try {
            const validatedData: emailVerificationType = emailVerificationSchema.parse(req.query)

            await authServices.verifyEmail(validatedData)

            // send 200 success message
            res
            .status(200)
            .json(new ApiResponse(200, {}, "Email verified successfully. Please, login to continue"))

        } catch(error) {
            next(error)
        }
    },

    // USER LOGIN CONTROLLER FUNCTION
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

    // USER LOGOUT CONTROLLER FUNCTION
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

    // USER ACCOUNT VIEW CONTROLLER FUNCTION
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

    // REFRESH ACCESS TOKEN CONTROLLER FUNCTION
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
            const { accessToken, refreshToken } = await authServices.refreshToken(token, userId)

            // send 200 message
            res.status(200)
            .cookie('refreshToken', refreshToken, COOKIES_OPTIONS)
            .json(new ApiResponse(200, {accessToken}))
        } catch(error) {
            next(error)
        }
    },

    // CHANGE PASSWORD CONTROLLER FUNCTION
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

            // get the new access token and refresh token after updating the password
            const { accessToken, refreshToken } = await authServices.changePassword(userId, validatedData)

            // send 200 message
            res.status(200)
            .cookie('refreshToken', refreshToken, COOKIES_OPTIONS)
            .json(new ApiResponse(200, {accessToken}, "Successfully password changed"))

        } catch(error) {
            next(error)
        }
    },

    // UPDATE USER ACCOUNT CONTROLLER FUNCTION
    async updateAccount(req: Request, res: Response, next: NextFunction) {
        try {
            // get the user id
            const userId = req.user?.userId

            // if the userId is missing throw error
            if(!userId) {
                throw new ApiError(401, "Access Denied")
            }

            // validate the user data
            const updates: updateAccountType = updateAccountSchema.parse(req.body)

            // if no data was provided throw error
            if( Object.keys(updates).length === 0 ) {
                throw new ApiError(400, "No data provided for updates")
            }

            // update the account
            const updatedAccount = await authServices.updateAccount(userId, updates)

            // send 200 success message
            res
            .status(200)
            .json(new ApiResponse(200, updatedAccount, "Successfully updated account"))

        } catch(error) {
            next(error)
        }
    },

    // FORGET PASSWORD CONTROLLER FUNCTION
    async forgetPassword(req: Request, res: Response, next: NextFunction) {
        try {
            // validate the user data
            const userInfo: forgetPasswordType = forgetPasswordSchema.parse(req.body)

            // db query for the user data send by the user
            await authServices.forgetPassword(userInfo)

            // send 200 success message despite any error
            res.status(200)
            .json(new ApiResponse(200, {}, "Token has been send to your email. Please, check your email"))
        } catch(error) {
            next(error)
        }
    },

    // RESET PASSWORD CONTROLLER FUNCTION
    async resetPassword(req: Request, res: Response, next: NextFunction) {
        try {
            // validate the user data
            const validatedData: resetPasswordType = resetPasswordSchema.parse(req.body)

            // get the new access token and refresh token after reseting password
            const {refreshToken, accessToken} = await authServices.resetPassword(validatedData)

            // send 200 message
            res.status(200)
            .cookie('refreshToken', refreshToken, COOKIES_OPTIONS)
            .json(new ApiResponse(200, {accessToken}, "Successfully password reset, You are logged in"))
        } catch(error) {
            next(error)
        }
    },

    // RESEND VERIFICATION CONTROLLER FUNCTION
    async resendVerification(req: Request, res: Response, next: NextFunction) {
        try {
            // validate the user data
            const userInfo: requestVerificationType = requestVerificationSchema.parse(req.body)

            // db query for the user data send by the user
            await authServices.resendVerification(userInfo)

            // send 200 success message despite any error
            res.status(200)
            .json(new ApiResponse(200, {}, "Token has been send to your email. Please, check your email"))
        } catch(error) {
            next(error)
        }
    },
}