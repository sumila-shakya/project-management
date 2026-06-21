import { z } from 'zod'
import { PROCESS_INVITATION_STATUS } from '../utils/constants'

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

export type invitationType = z.infer<typeof invitationSchema>
export type processInvitationType = z.infer<typeof processInvitationSchema>