import { ApiError } from "./apiError"

export const parseId = (value: string): number => {
    const id = Number(value)
    
    //check if the id is a actual positive number
    if(isNaN(id) || id <= 0) {
        throw new ApiError(400, "Invalid id")
    }

    return id
}