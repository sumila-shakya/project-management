import { db } from "../config/mysql.config";
import { notifications } from "../models/mysql.model";
import { filterNotificationType } from "../validator/notification.validator";
import { DEFAULT_PAGE_LIMIT } from "../utils/constants";
import { eq, or, lt, gt, and, asc, desc } from "drizzle-orm";
import { encodeNotificationCursor, decodeNotificationCursor } from "../utils/cursor";
import { NotificationCursor, CursorPageMetaData } from "../@types/interface";


export const notificationServices = {
    async getNotifications(userId: number, filterData: filterNotificationType) {
        const limit: number = filterData.limit || DEFAULT_PAGE_LIMIT
        const pageMetaData: CursorPageMetaData = {
            nextPage: false,
            limit: limit
        }

        const queryFilters = []

        queryFilters.push(eq(notifications.recipientId, userId))

        if(filterData.notificationStatus) {
            const isRead: boolean = filterData.notificationStatus === 'read' ? true: false
            queryFilters.push(eq(notifications.isRead, isRead))
        }

        if(filterData.cursor) {
            const cursor: NotificationCursor = decodeNotificationCursor(filterData.cursor)
            queryFilters.push(or(
                lt(notifications.createdAt, cursor.createdAt),
                and(
                    eq(notifications.createdAt, cursor.createdAt),
                    gt(notifications.notificationId, cursor.notificationId)
                )
            ))
        }

        const userNotifications = await db
        .select()
        .from(notifications)
        .where(and(...queryFilters))
        .orderBy(
            desc(notifications.createdAt), 
            asc(notifications.notificationId)
        )
        .limit(limit+1)

        if(userNotifications.length > limit) {
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
    }
}