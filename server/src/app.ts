import express from 'express'
import { ApiResponse } from './utils/apiResponse'
import { errorHandler } from './middlewares/error.middleware'
import { db } from './config/mysql.config'
import authRouter from './routes/auth.route'
import mongoose from 'mongoose'

const app = express()

// EXPRESS GLOBAL MIDDLEWARES
app.use(express.json())
app.use(express.urlencoded({extended: true}))

app.use('/api/auth', authRouter)

// HEALTH STATUS CHECKUP
app.get('/api/health', async (req, res, next) => {
    try {
        /*
        //simulating the error to test the global error middleware
        throw new Error("Simulated Crash")
        */

       //testing the mongodb connection
       const mongodbStatus = mongoose.connection.readyState === 1 ? "Connected" : "Disconnected"

        //testing the mysql connection
        await db.execute('SELECT 1')

        const healthData = {
            server: "UP",
            mysql: "Connected",
            mongodb: mongodbStatus,
            timestamp: new Date().toISOString()
        }

        res
        .status(200)
        .json(new ApiResponse(200, healthData, "Server is running !!"))

    } catch(error) {
        next(error)
    }
})

// GLOBAL ERROR MIDDLEWARE
app.use(errorHandler)

export { app }