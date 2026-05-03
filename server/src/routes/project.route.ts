import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { projectController } from "../controllers/project.controller";

const router = Router()

router.use(authMiddleware)



export default router