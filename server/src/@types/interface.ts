import { ROLE, TASK_STATUS } from "../utils/constants"
// authenticated user
export interface Payload {
    userId: number
}

export type Role = typeof ROLE[number]

export type TaskStatus = typeof TASK_STATUS[number]