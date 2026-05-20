import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { taskAssetsController } from "../controllers/task-assets.controller";

const router = Router()

router.use(authMiddleware)

router.get('/:assetId/download', taskAssetsController.downloadAsset)

router.delete('/:assetId', taskAssetsController.deleteAsset)

export default router