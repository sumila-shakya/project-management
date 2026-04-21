import { db } from "../config/mysql.config";
import { users, User, NewUser, refreshTokens, NewToken } from "../models/mysql.model";
import { registrationType, loginType, changePasswordType } from "../utils/validator";
import { eq, and } from "drizzle-orm";
import { ApiError } from "../utils/apiError";
import bcrypt from 'bcrypt'
import { Payload } from "../@types/interface";
import { jwtUtils } from "../utils/jwt";

export const authServices = {
    async register(data: registrationType) {
        // check for the existing user
        const existingUser: User[] = await db
        .select()
        .from(users)
        .where(eq(users.email, data.email))

        // throw error if the user already exists
        if(existingUser.length > 0) {
            throw new ApiError(409, "User already exists")
        }

        // hash the password for safety
        const hashedPassword: string = await bcrypt.hash(data.password, 10)

        const newUser: NewUser = {
            email: data.email,
            name: data.name,
            password: hashedPassword,
            ...(data.bio && {bio: data.bio})
        }

        // insert the new user into the database
        const [result] = await db
        .insert(users)
        .values(newUser)

        const payload: Payload = {
            userId: result.insertId
        }

        // generate access and refresh tokens
        const accessToken: string = jwtUtils.generateAccessToken(payload)
        const refreshToken: string = jwtUtils.generateRefreshToken(payload)
        const expiryDate: Date = jwtUtils.getExpiryDate()

        const newToken: NewToken = {
            userId: result.insertId,
            token: refreshToken,
            expiresAt: expiryDate
        }

        // insert token into the database
        await db
        .insert(refreshTokens)
        .values(newToken)

        return {
            userId: result.insertId,
            email: data.email,
            name: data.name,
            accessToken,
            refreshToken
        }
    },

    async login(data: loginType) {
        // check for the existing user
        const [existingUser]: User[] = await db
        .select()
        .from(users)
        .where(eq(users.email, data.email))

        // if the user doesn't exists throw error
        if(!existingUser) {
            throw new ApiError(401, "Invalid credentials")
        }

        // compare the password
        const isValidPassword = await bcrypt.compare(data.password, existingUser.password)
        if(!isValidPassword) {
            throw new ApiError(401, "Invalid credentials")
        }

        const payload: Payload = {
            userId: existingUser.userId
        }

        // generate the new access and refresh tokens
        const accessToken: string = jwtUtils.generateAccessToken(payload)
        const refreshToken: string = jwtUtils.generateRefreshToken(payload)
        const expiryDate: Date = jwtUtils.getExpiryDate()

        // delete the old token
        await db
        .delete(refreshTokens)
        .where(eq(refreshTokens.userId, existingUser.userId))

        const newToken: NewToken = {
            userId: existingUser.userId,
            token: refreshToken,
            expiresAt: expiryDate
        }

        // insert the new token
        await db
        .insert(refreshTokens)
        .values(newToken)
        
        return {
            userId: existingUser.userId,
            email: existingUser.email,
            name: existingUser.name,
            accessToken,
            refreshToken
        }
    },

    async logout(userId: number) {
        // delete the refresh token from the database
        await db
        .delete(refreshTokens)
        .where(eq(refreshTokens.userId, userId))
    },

    async getAccount(userId: number) {
        // get the user data
        const [user] = await db
        .select()
        .from(users)
        .where(eq(users.userId, userId))

        // if the data doesn't exists throw error
        if(!user) {
            throw new ApiError(404, "Not Found")
        }

        //extract data without the password
        const { password , ...userInfo} = user

        //return the data without the password
        return userInfo
    },

    async refreshToken(token: string, userId: number) {
        //check for the existing token record
        const [tokenRecord] = await db
        .select()
        .from(refreshTokens)
        .where(and(
            eq(refreshTokens.userId, userId),
            eq(refreshTokens.token, token)
        ))

        // throw error if token record doesn't exists
        if(!tokenRecord) {
            throw new ApiError(401, "Access Denied")
        }

        // throw error if token expired
        if(tokenRecord.expiresAt < new Date()) {
            // delete the expired token
            await db
            .delete(refreshTokens)
            .where(eq(refreshTokens.tokenId, tokenRecord.tokenId))

            throw new ApiError(401, "Token expired! Please login again")
        }

        const payload: Payload = {
            userId: userId
        }

        // generate the new access and refresh tokens
        const accessToken: string = jwtUtils.generateAccessToken(payload)
        const refreshToken: string = jwtUtils.generateRefreshToken(payload)
        const expiryDate: Date = jwtUtils.getExpiryDate()

        // delete the old token (token rotation)
        await db
        .delete(refreshTokens)
        .where(eq(refreshTokens.tokenId, tokenRecord.tokenId))

        const newToken: NewToken = {
            userId: userId,
            token: refreshToken,
            expiresAt: expiryDate
        }

        // insert the new token
        await db
        .insert(refreshTokens)
        .values(newToken)
        
        // return new refresh token and access token
        return {
            accessToken,
            refreshToken
        }
    },

    async resetPassword(userId: number, data: changePasswordType) {
        // hash the password for safety
        const hashedPassword: string = await bcrypt.hash(data.password, 10)

        // update the database with new password
        const [result] = await db.update(users)
        .set({
            password: hashedPassword
        })
        .where(eq(users.userId, userId))

        if(result.affectedRows === 0) {
            throw new ApiError(404, "User Not Found")
        }

        const payload: Payload = {
            userId: userId
        }

        // generate the new access and refresh tokens
        const accessToken: string = jwtUtils.generateAccessToken(payload)
        const refreshToken: string = jwtUtils.generateRefreshToken(payload)
        const expiryDate: Date = jwtUtils.getExpiryDate()

        // delete the old token
        await db
        .delete(refreshTokens)
        .where(eq(refreshTokens.userId, userId))

        const newToken: NewToken = {
            userId: userId,
            token: refreshToken,
            expiresAt: expiryDate
        }

        // insert the new token
        await db
        .insert(refreshTokens)
        .values(newToken)
        
        return {
            accessToken,
            refreshToken
        }
    }
}