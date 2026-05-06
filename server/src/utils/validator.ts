import { z } from 'zod'
import { PROCESS_INVITATION_STATUS, ROLE, PROJECT_STATUS, TASK_PRIORITY, TASK_STATUS } from './constants'

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

// EMAIL VERIFICATION SCHEMA
export const emailVerificationSchema = z.object({
    token: z.string()
    .length(32, {message: "Invalid token"})
    .regex(/^[0-9a-f]+$/, {message: "Invalid token"})  
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

// FORGET PASSWORD SCHEMA
export const forgetPasswordSchema = z.object({
    email: z.string().email({ message: "Invalid email format" })
})

// RESET PASSWORD SCHEMA
export const resetPasswordSchema = z.object({
    token: z.string()
    .length(32, {message: "Invalid token"})
    .regex(/^[0-9a-f]+$/, {message: "Invalid token"}),
    password: z.string().min(8, { message:"Password must be atleast 8 characters long" })
    .regex(/[A-Z]/, { message:"Password must contain at least one uppercase letter" })
    .regex(/[a-z]/, { message:"Password must contain at least one lowercase letter" })
    .regex(/[0-9]/, { message:"Password must contain at least one digit" })
    .regex(/[^a-zA-Z0-9\s]/, { message:"Password must contain at least one special character" })
})

// RE REQUEST EMAIL SCHEMA
export const requestVerificationSchema = z.object({
    email: z.string().email({ message: "Invalid email format" })
})

// CREATE TEAM SCHEMA
export const createTeamSchema = z.object({
    teamName: z.string().min(2, { message: "Name must be atleast two charaters long" }).trim(),
    description: z.string().max(500, { message: "Description must be under 500 characters" }).optional()
})

// UPDATE TEAM SCHEMA
export const updateTeamSchema = createTeamSchema.partial()

// INVITATION SCHEMA
export const invitationSchema = z.object({
    inviteeId: z.coerce.number().positive()
})

// PROCESS INVITATION SCHEMA
export const processInvitationSchema = z.object({
    token: z.string()
    .length(32, {message: "Invalid token"})
    .regex(/^[0-9a-f]+$/, {message: "Invalid token"}),
    action: z.enum(PROCESS_INVITATION_STATUS, {message: "Invalid action"})
})

// UPDATE TEAM MEMBER SCHEMA
export const updateTeamMemberSchema = z.object({
    role: z.enum(ROLE, {message: "Invalid role"})
})

// PROJECT FIELDS
const projectFields = z.object({
    projectName: z.string().min(2, { message: "Project name must be atleast two charaters long" }).trim(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    description: z.string().max(500, { message: "Description must be under 500 characters" }).optional()
});

// PROJECT SCHEMA
export const projectSchema = projectFields
.refine((data) => data.startDate >= new Date(), {message: "Start date cannot be in past"})
.refine((data) => data.endDate > data.startDate, {message: "End date must be greater than start date"})

// PROJECT UPDATES SCHEMA
export const updateProjectSchema = projectFields.partial()
.refine((data) => {
    if(data.startDate) {
        return data.startDate >= new Date()
    }
    return true
}, {message: "Start date cannot be in past"})
.refine((data) => {
    if(data.endDate) {
        if(data.startDate) {
            return data.endDate > data.startDate
        }
        return data.endDate >= new Date()
    }
    return true
}, {message: "End date must be greater than start date"})

// PROJECT FILTER SCHEMA
export const filterProjectSchema = z.object({
    projectStatus: z.enum(PROJECT_STATUS, {message: "Invalid Status"}).optional()
})

export const taskSchema =  z.object({
    title: z.string().min(2, { message: "Title must be atleast two charaters long" }).trim(),
    description: z.string().max(500, { message: "Description must be under 500 characters" }).optional(),
    assignedTo: z.coerce.number().positive().optional(),
    parentTaskId: z.coerce.number().positive().optional(),
    taskStatus: z.enum(TASK_STATUS, {message: "Invalid Status"}).optional(),
    taskPriority: z.enum(TASK_PRIORITY, {message: "Invalid Priority"}),
    dueDate: z.coerce.date().refine((date) => date > new Date(), {message: "Due date must be in future"})
})

/* --------------------------------- VALIDATION TYPES --------------------------------- */
export type registrationType = z.infer<typeof registrationSchema>
export type emailVerificationType = z.infer<typeof emailVerificationSchema>
export type loginType = z.infer<typeof loginSchema>
export type changePasswordType = z.infer<typeof changePasswordSchema>
export type updateAccountType = z.infer<typeof updateAccountSchema>
export type forgetPasswordType = z.infer<typeof forgetPasswordSchema>
export type resetPasswordType = z.infer<typeof resetPasswordSchema>
export type requestVerificationType = z.infer<typeof requestVerificationSchema>
export type createTeamType = z.infer<typeof createTeamSchema>
export type updateTeamType = z.infer<typeof updateTeamSchema>
export type invitationType = z.infer<typeof invitationSchema>
export type processInvitationType = z.infer<typeof processInvitationSchema>
export type updateTeamMemberType = z.infer<typeof updateTeamMemberSchema>
export type projectType = z.infer<typeof projectSchema>
export type updateProjectType = z.infer<typeof updateProjectSchema>
export type filterProjectType = z.infer<typeof filterProjectSchema>
export type taskType = z.infer<typeof taskSchema>