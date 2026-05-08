import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { taskController } from "../controllers/task.controller";

const router = Router()

router.use(authMiddleware)

router.get('/', taskController.getTasks)

router.get('/:taskId', taskController.getTaskDetails)

router.patch('/:taskId', taskController.updateTask)

export default router