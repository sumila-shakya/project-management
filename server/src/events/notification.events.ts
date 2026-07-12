import EventEmitter from "node:events";
import { NotificationType } from "../@types/interface";
import { notifications, NewNotification } from "../models/mysql.model";
import { db } from "../config/mysql.config";

export const notificationEmitter = new EventEmitter()

notificationEmitter.on('notification_generated', async(
    notificationType: NotificationType, 
    message: string, 
    recipients: number[]) => {

    try{
        for(const recipientId of recipients) {
            const newNotification: NewNotification = {
                notificationType: notificationType,
                message: message,
                recipientId: recipientId
            }

            await db
            .insert(notifications)
            .values(newNotification)
        }
    }catch(error) {
        const message = error instanceof Error ? error.message: error
        console.error('Notification push error: ', message)
    }
})