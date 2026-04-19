import { db } from "../config/mysql.config";
import { users, User, NewUser } from "../models/mysql.model";
import { registrationType } from "../utils/validator";
import { eq } from "drizzle-orm";
import { ApiError } from "../utils/apiError";
import bcrypt from 'bcrypt'

export const authServices = {
    async register(data: registrationType) {
        const existingUser: User[] = await db
        .select()
        .from(users)
        .where(eq(users.email, data.email))

        if(existingUser.length > 0) {
            throw new ApiError(409, "User already exists")
        }

        const hashedPassword: string = await bcrypt.hash(data.password, 10)

        const newUser: NewUser = {
            email: data.email,
            name: data.name,
            password: hashedPassword
        }

        const [result] = await db
        .insert(users)
        .values(newUser)

        
    }
}