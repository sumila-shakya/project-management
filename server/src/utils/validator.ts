import { email, z } from 'zod'

// REGISTRATION SCHEMA
export const registrationSchema = z.object({
    name: z.string().min(2, { message: "Name must be atleast two charaters long" }).trim(),
    email: z.string().email({ message: "Invalid email format" }),
    password: z.string().min(8, { message:"Password must be atleast 8 characters long" })
    .regex(/[A-Z]/, { message:"Password must contain at least one uppercase letter" })
    .regex(/[a-z]/, { message:"Password must contain at least one lowercase letter" })
    .regex(/[0-9]/, { message:"Password must contain at least one digit" })
    .regex(/[^a-zA-Z0-9\s]/, { message:"Password must contain at least one special character" }),
    bio: z.string().optional()
})

// LOGIN SCHEMA
export const loginSchema = z.object({
    email: z.string().email({ message: "Invalid email format" }),
    password: z.string().min(1, { message: "Password is required" })
})

// CHANGE THE PASSWORD SCHEMA
export const changePasswordSchema = z.object({
    password: z.string().min(8, { message:"Password must be atleast 8 characters long" })
    .regex(/[A-Z]/, { message:"Password must contain at least one uppercase letter" })
    .regex(/[a-z]/, { message:"Password must contain at least one lowercase letter" })
    .regex(/[0-9]/, { message:"Password must contain at least one digit" })
    .regex(/[^a-zA-Z0-9\s]/, { message:"Password must contain at least one special character" })
})

// PAYLOAD SCHEMA
export const payloadSchema = z.object({
    userId: z.coerce.number().positive()
})

// UPDATE ACCOUNT SCHEMA
export const updateAccountSchema = z.object({
    name: z.string().min(2, { message: "Name must be atleast two charaters long" }).trim().optional(),
    bio: z.string().max(500, { message: "Bio must be under 500 characters" }).optional()
})

/* ---------------------------------VALIDATION TYPES--------------------------------- */
export type registrationType = z.infer<typeof registrationSchema>
export type loginType = z.infer<typeof loginSchema>
export type changePasswordType = z.infer<typeof changePasswordSchema>
export type updateAccountType = z.infer<typeof updateAccountSchema>