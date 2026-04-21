import jwt from 'jsonwebtoken'
import { ApiError } from './apiError'
import { Payload } from '../@types/interface'

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET!
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET!

export const jwtUtils = {
    generateAccessToken(payload: Payload): string {
        if(!ACCESS_TOKEN_SECRET) {
            console.error("Access token not defined!")
        }
        return jwt.sign(payload, ACCESS_TOKEN_SECRET, { expiresIn: '10m' })
    },

    generateRefreshToken(payload: Payload): string {
        if(!REFRESH_TOKEN_SECRET) {
            console.error("Refresh token not defined!")
        }
        return jwt.sign(payload, REFRESH_TOKEN_SECRET, { expiresIn: '7d' })
    },

    getExpiryDate(): Date {
        return new Date(Date.now() + 7*24*60*60*1000)
    },

    verifyAccessToken(accessToken: string): Payload {
        try {
            const decoded = jwt.verify(accessToken, ACCESS_TOKEN_SECRET) as Payload
            return decoded
        } catch(error) {
            if(error instanceof jwt.TokenExpiredError) {
                throw new ApiError(401, "Token expired!!")
            }
            throw new ApiError(401, "Invalid token!!")
        }
    },

    verifyRefreshToken(refreshToken: string): Payload {
        try {
            const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET) as Payload
            return decoded
        } catch(error) {
            if(error instanceof jwt.TokenExpiredError) {
                throw new ApiError(401, "Token expired!!")
            }
            throw new ApiError(401, "Invalid token!!")
        }
    }
}