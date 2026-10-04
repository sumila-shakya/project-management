import { Worker, Job } from "bullmq";
import { RedisClient } from "../config/redis.config";
import { IAnalyticsLog } from "../@types/interface";
import { AnalyticsLog } from "../models/mongodb.model";

export const analyticsWorker = new Worker<IAnalyticsLog>(
    'analytics_log_queue',
    async (job: Job<IAnalyticsLog>) => {
        await AnalyticsLog.create(job.data)
        console.log("Data logged successfully")
    },
    {
        connection: RedisClient
    }
)

analyticsWorker.on('completed', (job: Job<IAnalyticsLog>) => {
    console.log(`Logging completed for: (${job.data.target.taskId})[${job.data.target.taskName}]`)
})

analyticsWorker.on('failed', (job, error) => {
    console.error("Error: ", {
        jobId: job?.id,
        message: error.message
    })
})