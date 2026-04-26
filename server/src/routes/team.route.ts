import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { teamController } from "../controllers/team.controller";

const router = Router()

// authenticate the user
router.use(authMiddleware)

/* ------------------------------------ TEAM CRUD ROUTES ------------------------------------ */
// TEAM CREATION ROUTE
router.post('/', teamController.createTeam)

export default router