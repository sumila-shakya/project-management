import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { commentController } from "../controllers/comment.controller";

const router = Router()

router.use(authMiddleware)

router.patch('/:commentId', commentController.editComment)

export default router