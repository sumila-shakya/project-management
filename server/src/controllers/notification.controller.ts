import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/apiError";
import { ApiResponse } from "../utils/apiResponse";
import { notificationServices } from "../services/notification.service";
import { filterNotificationSchema, filterNotificationType } from "../validator/notification.validator";
import { parseId } from "../utils/validate-id";

export const notificationController = {
    async getNotifcations(req: Request, res: Response, next: NextFunction) {
        try {
            // get the user id from the request
            const userId = req.user?.userId

            //if not the user id throw error
            if(!userId) {
                throw new ApiError(401, "Access Denied")
            }

            const filterData: filterNotificationType = filterNotificationSchema.parse(req.query)

            const userNotifications = notificationServices.getNotifications(userId, filterData)

            res
            .status(200)
            .json(new ApiResponse(200, userNotifications))
        } catch(error) {
            next(error)
        }
    },

    async readNotification(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.userId

            //if not the user id throw error
            if(!userId) {
                throw new ApiError(401, "Access Denied")
            }

            const notificationId = parseId(req.params.notificationId as string)

            await notificationServices.readNotification(userId, notificationId)

            res
            .status(200)
            .json(new ApiResponse(200, {}, "notification read successfully"))
        } catch(error) {
            next(error)
        }
    },

    async unreadNotification(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.userId

            //if not the user id throw error
            if(!userId) {
                throw new ApiError(401, "Access Denied")
            }

            const notificationId = parseId(req.params.notificationId as string)

            await notificationServices.unreadNotification(userId, notificationId)

            res
            .status(200)
            .json(new ApiResponse(200, {}, "notification read successfully"))
        } catch(error) {
            next(error)
        }
    }
}