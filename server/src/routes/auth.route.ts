import { Router } from "express";
import { authController } from "../controllers/auth.controller";

const router = Router()

// REGISTRATION ROUTE
router.post('/register', authController.register)

// LOGIN ROUTE
router.post('/login', authController.login)

export default router