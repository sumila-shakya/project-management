import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379"

export const RedisClient = new Redis(redisUrl, {
    maxRetriesPerRequest: null
})


RedisClient.on("error", () => {
    console.error("failed to connect to redis")
})

RedisClient.on("ready", () => {
    console.log("Redis Connected")
})