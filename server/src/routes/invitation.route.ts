import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { invitationController } from "../controllers/invitation.controller";

const router = Router()

router.use(authMiddleware)

router.get('/', invitationController.getInvitation)

router.patch('/:invitationId/process', invitationController.processInvitation)

export default router