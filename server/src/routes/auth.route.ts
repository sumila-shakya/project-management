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

// GET NEW ACCESS TOKEN ROUTE
router.post('/refresh', authController.refreshToken)

// CHANGE THE PASSWORD ROUTE
router.patch('/change-password', authMiddleware, authController.changePassword)

// UPDATE THE USER ACCOUNT ROUTE
router.patch('/me', authMiddleware, authController.updateAccount)

// FORGET PASSWORD ROUTE
router.post('/forget-password', authController.forgetPassword)

// RESET PASSWORD ROUTE
router.post('/reset-password', authController.resetPassword)

export default router