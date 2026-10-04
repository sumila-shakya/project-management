import { Worker, Job } from "bullmq";
import { RedisClient } from "../config/redis.config";
import { notifications, NewNotification } from "../models/mysql.model";
import { db } from "../config/mysql.config";

export const notificationWorker = new Worker<NewNotification>(
    'notification_queue',
    async (job: Job<NewNotification>) => {
        await db
        .insert(notifications)
        .values(job.data)
    },
    {
        connection: RedisClient
    }
)

notificationWorker.on('completed', (job: Job<NewNotification>) => {
    console.log(`Notification pushed: [${job.data.notificationType}]`)
})

notificationWorker.on('failed', (job, error) => {
    console.error("Error: ", {
        jobId: job?.id,
        message: error.message
    })
})