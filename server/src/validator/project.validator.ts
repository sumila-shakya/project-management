import { z } from 'zod'
import { PROJECT_STATUS } from '../utils/constants';

// PROJECT FIELDS
const projectFields = z.object({
    projectName: z.string().min(2, { message: "Project name must be atleast two charaters long" }).trim(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date(),
    description: z.string().max(500, { message: "Description must be under 500 characters" }).optional()
});

// PROJECT SCHEMA
export const projectSchema = projectFields
.refine((data) => {
    if(data.startDate) {
        return data.startDate >= new Date()
    }
    return true
}, {message: "Start date cannot be in past"})
.refine((data) => {
    if(data.startDate) {
        return data.endDate > data.startDate
    }
    return true
}, {message: "End date must be greater than start date"})

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
    projectStatus: z.enum(PROJECT_STATUS, {message: "Invalid Status"}).optional(),
    page: z.coerce.number().positive().optional(),
    limit: z.coerce.number().positive().max(10).optional()
})

/* --------------------------------- VALIDATION TYPES --------------------------------- */
export type projectType = z.infer<typeof projectSchema>
export type updateProjectType = z.infer<typeof updateProjectSchema>
export type filterProjectType = z.infer<typeof filterProjectSchema>