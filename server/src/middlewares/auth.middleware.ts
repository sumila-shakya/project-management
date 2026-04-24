import { Request, Response, NextFunction } from "express";
import { Payload } from "../@types/interface";
import { ApiError } from "../utils/apiError";
import { jwtUtils } from "../utils/jwt";

// AUTHENTICATION MIDDLEWARE
export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // grab the authentication header of the request
        const authHeader = req.headers.authorization

        // extract the access token from the header
        const token = authHeader && authHeader.split(' ')[1]

        // if there is no token throw an error
        if(!token) {
            throw new ApiError(401, "Token must be provided")
        }

        // verify the token and get the payload
        const decoded: Payload = jwtUtils.verifyAccessToken(token)

        // set the request user field with payload data
        req.user = { userId: decoded.userId }
        next()
    } catch(error) {
        next(error)
    }
}