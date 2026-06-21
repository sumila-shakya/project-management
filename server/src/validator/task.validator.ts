import { z } from 'zod'
import { TASK_PRIORITY, TASK_STATUS } from '../utils/constants'

export const taskSchema =  z.object({
    title: z.string().min(2, { message: "Title must be atleast two charaters long" }).trim(),
    description: z.string().max(500, { message: "Description must be under 500 characters" }).optional(),
    assignedTo: z.coerce.number().positive().optional(),
    parentTaskId: z.coerce.number().positive().optional(),
    taskStatus: z.enum(TASK_STATUS, {message: "Invalid Status"}).optional(),
    taskPriority: z.enum(TASK_PRIORITY, {message: "Invalid Priority"}),
    dueDate: z.coerce.date().refine((date) => date > new Date(), {message: "Due date must be in future"})
})

export const filterTaskSchema = z.object({
    title: z.string().min(2, { message: "Title must be atleast two charaters long" }).trim().optional(),
    taskStatus: z.enum(TASK_STATUS, {message: "Invalid Status"}).optional(),
    taskPriority: z.enum(TASK_PRIORITY, {message: "Invalid Priority"}).optional(),
    page: z.coerce.number().positive().optional(),
    limit: z.coerce.number().positive().max(10).optional(),
})

export const updateTaskSchema = z.object({
    title: z.string().min(2, { message: "Title must be atleast two charaters long" }).trim().optional(),
    description: z.string().max(500, { message: "Description must be under 500 characters" }).optional(),
    taskPriority: z.enum(TASK_PRIORITY, {message: "Invalid Priority"}).optional(),
    dueDate: z.coerce.date().optional()
})
.refine((data) => {
    if(data.dueDate) {
        return data.dueDate > new Date()
    }
    return true
})

export const processTaskSchema = z.object({
    taskStatus: z.enum(TASK_STATUS, {message: "Invalid Status"})
})

export const assignTaskSchema = z.object({
    assignedTo: z.coerce.number().positive()
})


export type taskType = z.infer<typeof taskSchema>
export type filterTaskType = z.infer<typeof filterTaskSchema>
export type updateTaskType = z.infer<typeof updateTaskSchema>
export type processTaskType = z.infer<typeof processTaskSchema>
export type assignTaskType = z.infer<typeof assignTaskSchema>