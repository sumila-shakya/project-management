import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { commentController } from "../controllers/comment.controller";

const router = Router()

router.use(authMiddleware)

// EDIT COMMENT
router.patch('/:commentId', commentController.editComment)

// DELETE COMMENT
router.delete('/:commentId', commentController.deleteComment)

export default router