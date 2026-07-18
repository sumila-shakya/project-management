import { z } from 'zod'
import { PROCESS_INVITATION_STATUS, INVITATION_STATUS } from '../utils/constants'

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

// FILTER INVITATIONS SCHEMA
export const filterInvitationSchema = z.object({
    invitationStatus: z.enum(INVITATION_STATUS, {message: "Invalid status"}).optional(),
    page: z.coerce.number().positive().optional(),
    limit: z.coerce.number().positive().max(10).optional(),
})

/* --------------------------------- VALIDATION TYPES --------------------------------- */
export type invitationType = z.infer<typeof invitationSchema>
export type processInvitationType = z.infer<typeof processInvitationSchema>
export type filterInvitationType = z.infer<typeof filterInvitationSchema>