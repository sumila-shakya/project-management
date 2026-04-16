//custom API Error
export class ApiError <T> extends Error {
    
    public success: boolean
    public statusCode: number
    public errors: T[]

    constructor (
        statusCode: number, 
        message: string = "Something went wrong !!", 
        errors: T[] = []
    ) {
        //call parent class constructor
        super(message)

        this.statusCode = statusCode
        this.success = false
        this.errors = errors

        Error.captureStackTrace(this, this.constructor)
    } 
}