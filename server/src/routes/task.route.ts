import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { taskController } from "../controllers/task.controller";

const router = Router()

router.use(authMiddleware)

// GET MY TASK ROUTE
router.get('/my-tasks', taskController.getMyTasks)

// GET TASK DETAILS ROUTE
router.get('/:taskId', taskController.getTaskDetails)

// UPDATE TASK ROUTE
router.patch('/:taskId', taskController.updateTask)

// PROCESS TASK ROUTE
router.patch('/:taskId/status', taskController.processTask)

// ASSIGN TASK ROUTE
router.patch('/:taskId/assign', taskController.assignTask)

// GET SUB TASKS ROUTE
router.get('/:taskId/subtasks', taskController.getSubTasks)

export default router