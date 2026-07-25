import EventEmitter from "node:events";
import { notifications, NewNotification } from "../models/mysql.model";
import { db } from "../config/mysql.config";

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