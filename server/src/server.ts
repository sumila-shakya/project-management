import 'dotenv/config'
import express from 'express'
import { exit } from 'node:process'

const PORT = process.env.PORT || 3000
const app = express()

app.use(express.json())
app.use(express.urlencoded({extended: true}))

const startServer = async() => {
    try {
        console.log("Starting the server...")

        app.listen(PORT, ()=>{
            console.log(`Server listening at port ${PORT || 3000}`)
        })
    } catch(error) {
        const errorMsg = error instanceof Error ? error.message : error
        console.error("Failed to start the server, ", errorMsg)
        exit(1)
    }
}

startServer()