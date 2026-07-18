import { z } from 'zod'
import { NOTIFICATION_STATUS } from '../utils/constants'

// NOTIFICATION FILTER SCHEMA
export const filterNotificationSchema = z.object({
    notificationStatus: z.enum(NOTIFICATION_STATUS, {message: "Invalid Status"}).optional(),
    cursor: z.string().optional(),
    limit: z.coerce.number().positive().max(10).optional(),
})

/* --------------------------------- VALIDATION TYPES --------------------------------- */
export type filterNotificationType = z.infer<typeof filterNotificationSchema>