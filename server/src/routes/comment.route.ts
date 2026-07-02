import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { commentController } from "../controllers/comment.controller";

const router = Router()

// AUTHENTICATE THE USER
router.use(authMiddleware)

// EDIT COMMENT ROUTE
router.patch('/:commentId', commentController.editComment)

// DELETE COMMENT ROUTE
router.delete('/:commentId', commentController.deleteComment)

export default router