import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { projectController } from "../controllers/project.controller";

const router = Router()

// AUTHENTICATE THE USER
router.use(authMiddleware)

// GET PROJECT DETAILS ROUTE
router.get('/:projectId', projectController.getProjectDetails)

// UPDATE PROJECT ROUTE
router.patch('/:projectId', projectController.updateProject)

// ARCHIVE PROJECT ROUTE
router.patch('/:projectId/archive', projectController.archiveProject)

// RESTORE PROJECT ROUTE
router.patch('/:projectId/restore', projectController.restoreProject)

// DELETE PROJECT ROUTE
router.delete('/:projectId', projectController.deleteProject)

export default router