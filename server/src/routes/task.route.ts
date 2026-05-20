import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { taskController } from "../controllers/task.controller";
import { commentController } from "../controllers/comment.controller";
import { taskAssetsController } from "../controllers/task-assets.controller";
import { upload } from "../middlewares/multer.middleware";

const router = Router()

// AUTHENTICATE THE USER
router.use(authMiddleware)


/* ------------------------------------ TASK ROUTES ------------------------------------ */
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

// DELETE THE TASK ROUTE
router.delete('/:taskId', taskController.deleteTask)


/* ------------------------------------ COMMENT ROUTES ------------------------------------ */
// ADD COMMENT
router.post('/:taskId/comments', commentController.addComment)

// GET COMMENTS
router.get('/:taskId/comments', commentController.getComments)


/* ------------------------------------ TASK ASSETS ROUTES ------------------------------------ */
// ATTACH ASSETS
router.post('/:taskId/assets', upload.single('asset'), taskAssetsController.attachAsset)

// GET ALL TASK ASSETS META DATA
router.get('/:taskId/assets', taskAssetsController.getTaskAssets)


export default router