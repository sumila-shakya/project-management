import { ROLE, TASK_STATUS, ACTIONS } from "../utils/constants"
// authenticated user
export interface Payload {
    userId: number
}

export type Role = typeof ROLE[number]

export type TaskStatus = typeof TASK_STATUS[number]

export type Actions = typeof ACTIONS[number]

export interface IChanges {
    field: string,
    oldValue: unknown,
    newValue: unknown
}

export interface IAnalyticsLog {
    taskId: string,
    userId: string,
    action: Actions,
    changes?: IChanges[],
    timestamp: Date
}