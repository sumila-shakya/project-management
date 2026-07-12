import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { notificationController } from "../controllers/notification.controller";

const router = Router()

router.use(authMiddleware)

router.get('/', notificationController.getNotifcations)

export default router