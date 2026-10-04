import { Queue } from "bullmq";
import { RedisClient } from "../config/redis.config";
import { IAnalyticsLog } from "../@types/interface";
import { NewNotification } from "../models/mysql.model";

export const analyticslogQueue = new Queue<IAnalyticsLog>('analytics_log_queue', {
    connection: RedisClient
})

export const notificationQueue = new Queue<NewNotification>('notification_queue', {
    connection: RedisClient
})