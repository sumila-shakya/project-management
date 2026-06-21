import { z } from 'zod'

export const commentContentSchema = z.object({
    content: z.string()
    .min(2, { message: "Comment must be atleast two charaters long" })
    .max(2000, { message: "Comment must be under 2000 characters" })
})

export type commentContentType = z.infer<typeof commentContentSchema>