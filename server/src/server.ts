import 'dotenv/config'
import { exit } from 'node:process'
import { app } from './app'

const PORT = process.env.PORT || 3000

const startServer = async() => {
    try {
        console.log("Starting the server...")

        //server listening at port 3000
        app.listen(PORT, ()=>{
            console.log(`Server listening at port ${PORT || 3000}`)
        })

    } catch(error) {
        //log the error message in case of server failure
        const errorMsg = error instanceof Error ? error.message : error
        console.error("Failed to start the server, ", errorMsg)

        //terminate the process in case of server failure
        exit(1)
    }
}

//start the server
startServer()