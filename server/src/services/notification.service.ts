import { db } from "../config/mysql.config";
import { notifications } from "../models/mysql.model";
import { filterNotificationType } from "../validator/notification.validator";
import { DEFAULT_PAGE_LIMIT } from "../utils/constants";
import { eq, or, lt, gt, and, asc, desc } from "drizzle-orm";
import { encodeNotificationCursor, decodeNotificationCursor } from "../utils/cursor";
import { NotificationCursor, CursorPageMetaData } from "../@types/interface";
import { ApiError } from "../utils/apiError";


export const notificationServices = {
    // GET NOTIFICATIONS SERVICE FUNCTION
    async getNotifications(userId: number, filterData: filterNotificationType) {
        // get the pagination data
        const limit: number = filterData.limit || DEFAULT_PAGE_LIMIT
        const pageMetaData: CursorPageMetaData = {
            nextPage: false,
            limit: limit
        }

        const queryFilters = []

        // get the notifications intended for user
        queryFilters.push(eq(notifications.recipientId, userId))

        // get the query filter if it exists 
        if(filterData.notificationStatus) {
            const isRead: boolean = filterData.notificationStatus === 'read' ? true: false
            queryFilters.push(eq(notifications.isRead, isRead))
        }

        // get the cursor if exists
        if(filterData.cursor) {
            // decode the cursor
            const cursor: NotificationCursor = decodeNotificationCursor(filterData.cursor)
            queryFilters.push(or(
                lt(notifications.createdAt, cursor.createdAt),
                and(
                    eq(notifications.createdAt, cursor.createdAt),
                    gt(notifications.notificationId, cursor.notificationId)
                )
            ))
        }

        // fetch the user notifications from the database
        const userNotifications = await db
        .select()
        .from(notifications)
        .where(and(...queryFilters))
        .orderBy(
            desc(notifications.createdAt), 
            asc(notifications.notificationId)
        )
        .limit(limit+1)

        // calculate the next cursor if next page exists
        if(userNotifications.length > limit) {
            // create the new cursor
            const nextCursorData: NotificationCursor = {
                createdAt: userNotifications[limit-1].createdAt!, 
                notificationId: userNotifications[limit-1].notificationId
            }
            
            // encode the cursor data
            const nextCursor: string = encodeNotificationCursor(nextCursorData)
            
            // update the pagination meta data
            pageMetaData.nextPage = true
            pageMetaData.nextCursor = nextCursor
        }

        // if next page exists only show the current page comments
        const currentPageData = pageMetaData.nextPage 
        ? userNotifications.slice(0, limit) 
        : userNotifications
        
        return {
            pageMetaData,
            currentPageData
        }
    },

    // READ NOTIFICATION SERVICE FUNCTION
    async readNotification(userId: number, notificationId: number) {
        // fetch the existing notification
        const [existingNotification] = await db
        .select()
        .from(notifications)
        .where(and(
            eq(notifications.notificationId, notificationId),
            eq(notifications.recipientId, userId)
        )) 

        // throw error if notification is not found
        if(!existingNotification) {
            throw new ApiError(403, "Access denied")
        }

        // throw error if the notification is already read
        if(existingNotification.isRead) {
            throw new ApiError(400, 'Notification already read')
        }

        // update the notification status
        await db
        .update(notifications)
        .set({
            isRead: true
        })
        .where(eq(notifications.notificationId, notificationId))
    },

    // UNREAD NOTIFCATIONS SERVICE FUNCTION
    async unreadNotification(userId: number, notificationId: number) {
        // fetch the notification from the database
        const [existingNotification] = await db
        .select()
        .from(notifications)
        .where(and(
            eq(notifications.notificationId, notificationId),
            eq(notifications.recipientId, userId)
        )) 

        // throw error is notification does not exists
        if(!existingNotification) {
            throw new ApiError(403, "Access denied")
        }

        // throw error if the notification is already unread
        if(!existingNotification.isRead) {
            throw new ApiError(400, 'Notification already is not read')
        }

        // update the notification status
        await db
        .update(notifications)
        .set({
            isRead: false
        })
        .where(eq(notifications.notificationId, notificationId))
    },

    // READ ALL NOTIFICATIONS SERVICE FUNCTION
    async readAllNotifications(userId: number) {
        //  mark all the user notifications as read
        await db
        .update(notifications)
        .set({
            isRead: true
        })
        .where(eq(notifications.recipientId, userId))
    },

    // DELETE NOTIFICATION SERVICE FUNCTION
    async deleteNotification(userId: number, notificationId: number) {
        // delete the notification
        const [result] = await db
        .delete(notifications)
        .where(and(
            eq(notifications.notificationId, notificationId),
            eq(notifications.recipientId, userId)
        ))

        // throw error if no notification was deleted
        if(result.affectedRows === 0) {
            throw new ApiError(403, "Access denied")
        }
    }
}