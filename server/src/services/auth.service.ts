import { db } from "../config/mysql.config";
import { users, User, NewUser, refreshTokens, NewToken, resetPasswordTokens, NewResetPassToken, emailVerificationTokens, NewEmailToken } from "../models/mysql.model";
import { registrationType, loginType, changePasswordType, updateAccountType, forgetPasswordType, resetPasswordType, emailVerificationType, requestVerificationType } from "../utils/validator";
import { eq, and } from "drizzle-orm";
import { ApiError } from "../utils/apiError";
import bcrypt from 'bcrypt'
import { Payload } from "../@types/interface";
import { jwtUtils } from "../utils/jwt";
import { hashToken, generateToken } from "../utils/token";
import { sendResetPasswordMail, sendEmailVerificationMail } from "../utils/mailer";

export const authServices = {
    // USER REGISTRATION SERVICE FUNCTION
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
            ...(data.bio && {bio: data.bio}) //insert bio into the database if it exists
        }

        // insert the new user into the database
        const [result] = await db
        .insert(users)
        .values(newUser)

        // generate the verificationToken
        const verificationToken: string = generateToken()

        const newEmailToken: NewEmailToken = {
            userId: result.insertId,
            token: hashToken(verificationToken),
            expiresAt: new Date(Date.now() + 24*60*60*1000)
        }

        // delete the existing verification tokens
        await db
        .delete(emailVerificationTokens)
        .where(eq(emailVerificationTokens.userId, result.insertId))

        // insert the new email verification token
        await db
        .insert(emailVerificationTokens)
        .values(newEmailToken)

        // send email with verification token
        await sendEmailVerificationMail(data.email, verificationToken)

        return {
            userId: result.insertId,
            email: data.email,
            name: data.name
        }
    },

    // EMAIL VERIFICATION SERVICE FUNCTION
    async verifyEmail(data: emailVerificationType) {
        //check for the token in the database
        const [tokenRecord] = await db
        .select()
        .from(emailVerificationTokens)
        .where(eq(emailVerificationTokens.token, hashToken(data.token)))

        //if token doesn't exists throw error
        if(!tokenRecord) {
            throw new ApiError(400, "Invalid token")
        }

        //if the token is expired throw error
        if(tokenRecord.expiresAt < new Date()) {
            // delete the expired token
            await db
            .delete(emailVerificationTokens)
            .where(eq(emailVerificationTokens.tokenId, tokenRecord.tokenId))

            throw new ApiError(400, "Token Expired. Please, re-request the verification email")
        }

        // update the user to verified
        await db
        .update(users)
        .set({
            isverified: true
        })
        .where(eq(users.userId, tokenRecord.userId)),

        // delete the email verification token
        await db
        .delete(emailVerificationTokens)
        .where(eq(emailVerificationTokens.userId, tokenRecord.userId))


    },

    // USER LOGIN SERVICE FUNCTION
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

        // if the password doesn't match throw error
        if(!isValidPassword) {
            throw new ApiError(401, "Invalid credentials")
        }

        // verify the user
        if(!existingUser.isverified) {
            throw new ApiError(403, "please verify your email before logging in")
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

    // USER LOGOUT SERVICE FUNCTION
    async logout(userId: number) {
        // delete the refresh token from the database
        await db
        .delete(refreshTokens)
        .where(eq(refreshTokens.userId, userId))
    },

    // USER ACCOUNT VIEW SERVICE FUNCTION
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

    // REFRESH ACCESS SERVICE FUNCTION
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

    // CHANGE PASSWORD SERVICE FUNCTION
    async changePassword(userId: number, data: changePasswordType) {
        // hash the password for safety
        const hashedPassword: string = await bcrypt.hash(data.password, 10)

        // update the database with new password
        const [result] = await db.update(users)
        .set({
            password: hashedPassword
        })
        .where(eq(users.userId, userId))

        // if no data was updated throw error
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
    },

    // UPDATE USER ACCOUNT SERVICE FUNCTION
    async updateAccount(userId: number, updates: updateAccountType) {
        //update the account
        await db
        .update(users)
        .set(updates)
        .where(eq(users.userId, userId))

        //fetch the updated account
        const [updatedAccount]: User[] = await db
        .select()
        .from(users)
        .where(eq(users.userId, userId))

        //extract data without the password
        const { password , ...userInfo} = updatedAccount

        //return the data without the password
        return userInfo
    },

    // FORGET PASSWORD SERVICE FUNCTION
    async forgetPassword(data: forgetPasswordType) {
        //find the user according to the email
        const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, data.email))

        // if the user doesn't exists return without throwing error
        if(!user) {
            return
        }

        /*
        const [tokenRecord] = await db
        .select()
        .from(resetPasswordTokens)
        .where(eq(resetPasswordTokens.userId, user.userId))

        if(tokenRecord && tokenRecord.expiresAt > new Date()) {
            return
        }
        */

        //generate the reset token
        const resetToken: string = generateToken()

        const newResetToken: NewResetPassToken = {
            userId: user.userId,
            token: hashToken(resetToken),
            expiresAt: new Date(Date.now() + 15*60*1000)
        }

        // delete the existing reset tokens
        await db
        .delete(resetPasswordTokens)
        .where(eq(resetPasswordTokens.userId, user.userId))

        // insert the new reset token
        await db
        .insert(resetPasswordTokens)
        .values(newResetToken)

        // send the email to the user's inbox
        await sendResetPasswordMail(user.email, resetToken)
    },

    // RESET PASSWORD SERVICE FUNCTION
    async resetPassword(data: resetPasswordType) {
        //check for the token in the database
        const [tokenRecord] = await db
        .select()
        .from(resetPasswordTokens)
        .where(eq(resetPasswordTokens.token, hashToken(data.token)))

        //if token doesn't exists throw error
        if(!tokenRecord) {
            throw new ApiError(400, "Invalid token")
        }

        //if the token is expired throw error
        if(tokenRecord.expiresAt < new Date()) {
            throw new ApiError(400, "Token Expired")
        }

        // hash the password for safety
        const hashedPassword: string = await bcrypt.hash(data.password, 10)

        // update the database with new password
        const [result] = await db.update(users)
        .set({
            password: hashedPassword
        })
        .where(eq(users.userId, tokenRecord.userId))

        if(result.affectedRows === 0) {
            throw new ApiError(404, "User Not Found")
        }

        const payload: Payload = {
            userId: tokenRecord.userId
        }

        // generate the new access and refresh tokens
        const accessToken: string = jwtUtils.generateAccessToken(payload)
        const refreshToken: string = jwtUtils.generateRefreshToken(payload)
        const expiryDate: Date = jwtUtils.getExpiryDate()

        // delete the old token
        await db
        .delete(refreshTokens)
        .where(eq(refreshTokens.userId, tokenRecord.userId))

        const newToken: NewToken = {
            userId: tokenRecord.userId,
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
    },

    // RESEND VERIFICATION SERVICE FUNCTION
    async resendVerification(data: requestVerificationType) {
        //find the user according to the email
        const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, data.email))

        // if the user doesn't exists return without throwing error
        if(!user) {
            return
        }

        if(user.isverified) {
            return
        }

        //generate the reset token
        const verificationToken: string = generateToken()

        const newEmailToken: NewEmailToken = {
            userId: user.userId,
            token: hashToken(verificationToken),
            expiresAt: new Date(Date.now() + 24*60*60*1000)
        }

        // delete the existing verification tokens
        await db
        .delete(emailVerificationTokens)
        .where(eq(emailVerificationTokens.userId, user.userId))

        // insert the new email verification token
        await db
        .insert(emailVerificationTokens)
        .values(newEmailToken)

        // send email with verification token
        await sendEmailVerificationMail(data.email, verificationToken)
    }
}