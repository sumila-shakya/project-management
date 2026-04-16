import express from 'express'
import { ApiResponse } from './utils/apiResponse'
import { errorHandler } from './middlewares/error.middleware'

const app = express()

//express middlewares
app.use(express.json())
app.use(express.urlencoded({extended: true}))

//health status checkup
app.get('/api/health', async (req, res, next) => {
    try {
        /*
        //simulating the error to test the global error middleware
        throw new Error("Simulated Crash")
        */

        const healthData = {
            server: "UP",
            timestamp: new Date().toISOString()
        }

        res
        .status(200)
        .json(new ApiResponse(200, healthData, "Server is running !!"))

    } catch(error) {
        next(error)
    }
})

//using the global error middleware
app.use(errorHandler)

export { app }