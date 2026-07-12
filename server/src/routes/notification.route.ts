import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { notificationController } from "../controllers/notification.controller";

const router = Router()

router.use(authMiddleware)

router.get('/', notificationController.getNotifcations)

router.patch('/:notificationId/read', notificationController.readNotification)

router.patch('/:notificationId/unread', notificationController.unreadNotification)

router.patch('/read-all', notificationController.readAllNotifications)

router.delete('/:notificationId', notificationController.deleteNotification)

export default router