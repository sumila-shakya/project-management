import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { projectController } from "../controllers/project.controller";

const router = Router()

router.use(authMiddleware)

router.get('/:projectId', projectController.getProjectDetails)

router.patch('/:projectId', projectController.updateProject)

router.patch('/:projectId/archive', projectController.archiveProject)

router.patch('/:projectId/restore', projectController.restoreProject)

router.delete('/:projectId', projectController.deleteProject)

export default router