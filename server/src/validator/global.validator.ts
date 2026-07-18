import { z } from 'zod'

// PAYLOAD SCHEMA
export const payloadSchema = z.object({
    userId: z.coerce.number().positive()
})

// OFFSET BASED PAGINATION SCHEMA
export const paginationSchema = z.object({
    page: z.coerce.number().positive().optional(),
    limit: z.coerce.number().positive().max(10).optional(),
})

// CURSOR BASED PAGINATION SCHEMA
export const cursorPaginationSchema = z.object({
    cursor: z.string().optional(),
    limit: z.coerce.number().positive().max(10).optional(),
})

/* --------------------------------- VALIDATION TYPES --------------------------------- */
export type paginationType = z.infer<typeof paginationSchema>
export type cursorPaginationType = z.infer<typeof cursorPaginationSchema>