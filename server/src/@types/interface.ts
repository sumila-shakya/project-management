import { ROLE } from "../utils/constants"
// authenticated user
export interface Payload {
    userId: number
}

export type Role = typeof ROLE[number]