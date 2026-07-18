import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { notificationController } from "../controllers/notification.controller";

const router = Router()

// AUTHENTICATE THE USER
router.use(authMiddleware)

// GET NOTIFICATIONS ROUTE
router.get('/', notificationController.getNotifcations)

// READ NOTIFICATION ROUTE
router.patch('/:notificationId/read', notificationController.readNotification)

// UNREAD NOTIFICATION ROUTE
router.patch('/:notificationId/unread', notificationController.unreadNotification)

// READ ALL NOTIFICATIONS ROUTE
router.patch('/read-all', notificationController.readAllNotifications)

// DELETE NOTIFICATION ROUTE
router.delete('/:notificationId', notificationController.deleteNotification)

export default router