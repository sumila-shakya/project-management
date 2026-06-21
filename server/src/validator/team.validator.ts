import { z } from 'zod'
import { ROLE, ACTIONS } from '../utils/constants'

// CREATE TEAM SCHEMA
export const createTeamSchema = z.object({
    teamName: z.string().min(2, { message: "Name must be atleast two charaters long" }).trim(),
    description: z.string().max(500, { message: "Description must be under 500 characters" }).optional()
})

// UPDATE TEAM SCHEMA
export const updateTeamSchema = createTeamSchema.partial()

// UPDATE TEAM MEMBER SCHEMA
export const updateTeamMemberSchema = z.object({
    role: z.enum(ROLE, {message: "Invalid role"})
})

export const filterAnalyticsLogSchema = z.object({
    taskId: z.coerce.number().positive().optional(),
    userId: z.coerce.number().positive().optional(),
    projectId: z.coerce.number().positive().optional(),
    role: z.enum(ROLE, {message: "Invalid role"}).optional(),
    action: z.enum(ACTIONS, {message: "Invalid action"}).optional(),
    cursor: z.string().optional(),
    limit: z.coerce.number().positive().max(10).optional(),
})


export type createTeamType = z.infer<typeof createTeamSchema>
export type updateTeamType = z.infer<typeof updateTeamSchema>
export type updateTeamMemberType = z.infer<typeof updateTeamMemberSchema>
export type filterAnalyticsLogType = z.infer<typeof filterAnalyticsLogSchema>