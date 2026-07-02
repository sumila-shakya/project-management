import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { taskAssetsController } from "../controllers/task-assets.controller";

const router = Router()

// AUTHENTICATE THE USER
router.use(authMiddleware)

// DOWNLOAD/ VIEW THE ASSET ROUTE
router.get('/:assetId/download', taskAssetsController.downloadAsset)

// DELETE THE ASSET ROUTE
router.delete('/:assetId', taskAssetsController.deleteAsset)

export default router