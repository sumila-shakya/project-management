import { Router } from "express";
import { authController } from "../controllers/auth.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router()

// REGISTRATION ROUTE
router.post('/register', authController.register)

// LOGIN ROUTE
router.post('/login', authController.login)

// LOGOUT ROUTE
router.post('/logout', authMiddleware, authController.logout)

// GET USER INFO ROUTE
router.get('/me', authMiddleware, authController.getAccount)

export default router