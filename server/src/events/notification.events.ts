import EventEmitter from "node:events";
import { NotificationType } from "../@types/interface";
import { notifications, NewNotification } from "../models/mysql.model";
import { db } from "../config/mysql.config";

export const notificationEmitter = new EventEmitter()

// NOTIFICATION EVENT LISTENER
notificationEmitter.on('notification_generated', async(
    notificationType: NotificationType, 
    message: string, 
    recipients: number[]) => {

    try{
        const newNotifications: NewNotification[] = recipients.map((recipientId) => {
            const notification:NewNotification = {
                recipientId: recipientId,
                message: message,
                notificationType: notificationType
            }
            
            return notification
        })

        await db
        .insert(notifications)
        .values(newNotifications)
    }catch(error) {
        const message = error instanceof Error ? error.message: error
        console.error('Notification push error: ', message)
    }
})