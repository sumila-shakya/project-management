import { z } from 'zod'
import { ALLOWED_FILE_TYPE } from '../utils/constants'

// ASSETS FILTER SCHEMA
export const filterAssetsSchema = z.object({
    fileCategory: z.enum(ALLOWED_FILE_TYPE, {message: "Invalid file category"}).optional(),
    page: z.coerce.number().positive().optional(),
    limit: z.coerce.number().positive().max(10).optional(),
})

/* --------------------------------- VALIDATION TYPES --------------------------------- */
export type filterAssetsType = z.infer<typeof filterAssetsSchema>