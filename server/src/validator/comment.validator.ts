import { z } from 'zod'

// COMMENT CONTENT SCHEMA
export const commentContentSchema = z.object({
    content: z.string()
    .min(2, { message: "Comment must be atleast two charaters long" })
    .max(2000, { message: "Comment must be under 2000 characters" })
})

/* --------------------------------- VALIDATION TYPES --------------------------------- */
export type commentContentType = z.infer<typeof commentContentSchema>