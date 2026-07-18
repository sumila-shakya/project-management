import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/apiError";
import { ApiResponse } from "../utils/apiResponse";
import { notificationServices } from "../services/notification.service";
import { filterNotificationSchema, filterNotificationType } from "../validator/notification.validator";
import { parseId } from "../utils/validate-id";

export const notificationController = {
    // GET NOTIFICATIONS CONTROLLER FUNCTION
    async getNotifcations(req: Request, res: Response, next: NextFunction) {
        try {
            // get the user id from the request
            const userId = req.user?.userId

            //if not the user id throw error
            if(!userId) {
                throw new ApiError(401, "Access Denied")
            }

            // get the query filter from query param
            const filterData: filterNotificationType = filterNotificationSchema.parse(req.query)

            // get user notification
            const userNotifications = notificationServices.getNotifications(userId, filterData)

            // send 200 success msg
            res
            .status(200)
            .json(new ApiResponse(200, userNotifications))
        } catch(error) {
            next(error)
        }
    },

    // READ NOTIFICATION CONTROLLER FUNCTION
    async readNotification(req: Request, res: Response, next: NextFunction) {
        try {
            // get the user id from the request
            const userId = req.user?.userId

            //if not the user id throw error
            if(!userId) {
                throw new ApiError(401, "Access Denied")
            }

            // get the notification id from the url
            const notificationId = parseId(req.params.notificationId as string)

            // mark the notification as read
            await notificationServices.readNotification(userId, notificationId)

            // send 200 success msg
            res
            .status(200)
            .json(new ApiResponse(200, {}, "notification read successfully"))
        } catch(error) {
            next(error)
        }
    },

    // UNREAD NOTIFICATION CONTROLLER FUNCTION
    async unreadNotification(req: Request, res: Response, next: NextFunction) {
        try {
            // get the user id from the request
            const userId = req.user?.userId

            //if not the user id throw error
            if(!userId) {
                throw new ApiError(401, "Access Denied")
            }

            // get notification id from the url
            const notificationId = parseId(req.params.notificationId as string)

            //mark the notification as unread
            await notificationServices.unreadNotification(userId, notificationId)

            // send 200 success msg
            res
            .status(200)
            .json(new ApiResponse(200, {}, "notification read successfully"))
        } catch(error) {
            next(error)
        }
    },

    // READ ALL NOTIFICATIONS CONTROLLER FUNCTION
    async readAllNotifications(req: Request, res: Response, next: NextFunction) {
        try {
            // get the user id from the request
            const userId = req.user?.userId

            //if not the user id throw error
            if(!userId) {
                throw new ApiError(401, "Access Denied")
            }

            // mark all user notifications as read
            await notificationServices.readAllNotifications(userId)

            // send 200 success msg
            res
            .status(200)
            .json(new ApiResponse(200, {}, "all notifications marked as read successfully"))
        } catch(error) {
            next(error)
        }
    },

    // DELETE NOTIFICATION CONTROLLER FUNCTION
    async deleteNotification(req: Request, res: Response, next: NextFunction) {
        try {
            // get the user id from the request
            const userId = req.user?.userId

            //if not the user id throw error
            if(!userId) {
                throw new ApiError(401, "Access Denied")
            }

            // get the notification id from the url
            const notificationId = parseId(req.params.notificationId as string)

            // delete the notification
            await notificationServices.deleteNotification(userId, notificationId)

            // send 200 success msg
            res
            .status(200)
            .json(new ApiResponse(200, {}, "notification deleted successfully"))
        } catch(error) {
            next(error)
        }
    }
}