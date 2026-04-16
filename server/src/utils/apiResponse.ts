//custom API Response
export class ApiResponse<T> {

    public success: boolean
    public statusCode: number
    public message: string
    public data: T
    
    constructor (
        statusCode: number, 
        data: T, 
        message: string = "Success"
    ) {

        this.success = statusCode < 400
        this.statusCode = statusCode
        this.message = message
        this.data = data
    }
}