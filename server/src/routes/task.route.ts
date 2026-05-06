import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { taskController } from "../controllers/task.controller";

const router = Router()

router.use(authMiddleware)


export default router