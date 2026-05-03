import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { invitationController } from "../controllers/invitation.controller";

const router = Router()

// AUTHENTICATE THE USER
router.use(authMiddleware)

// GET ALL INVITATIONS ROUTE
router.get('/', invitationController.getInvitation)

// PROCESS THE INVITATION ROUTE
router.patch('/:invitationId/process', invitationController.processInvitation)

export default router