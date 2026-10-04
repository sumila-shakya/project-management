import { Queue } from "bullmq";
import { RedisClient } from "../config/redis.config";
import { IAnalyticsLog } from "../@types/interface";

export const analyticslogQueue = new Queue<IAnalyticsLog>('analytics_log_queue', {
    connection: RedisClient
})