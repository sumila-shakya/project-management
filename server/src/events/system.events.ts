import EventEmitter from "node:events";
import { notifications, NewNotification } from "../models/mysql.model";
import { db } from "../config/mysql.config";
import { IAnalyticsLog } from "../@types/interface";
import { AnalyticsLog } from "../models/mongodb.model";

export const systemEmitter = new EventEmitter()

// NOTIFICATION EVENT LISTENER
systemEmitter.on('notification_generated', async(newNotifications: NewNotification[]) => {
    try{
        await db
        .insert(notifications)
        .values(newNotifications)
    }catch(error) {
        const message = error instanceof Error ? error.message: error
        console.error('Notification push error: ', message)
    }
})

systemEmitter.on('analytics_log_generated', async(logs: IAnalyticsLog[]) => {
    try {
        await AnalyticsLog.insertMany(logs)
        console.log("Data logged successfully")
    } catch(error) {
        const message = error instanceof Error ? error.message: error
        console.error('Analytics logging error: ', message)
    }
})