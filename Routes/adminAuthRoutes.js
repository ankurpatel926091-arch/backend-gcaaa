import express from 'express';
import {
  loginAdmin,
  registerAdmin,
  getAdminProfile,
  updateAdminProfile,
  changeAdminPassword,
} from '../Controllers/adminAuthController.js';
import { protectAdmin } from '../Middlewares/authMiddleware.js';

const router = express.Router();

// Public routes
router.post('/login', loginAdmin);
router.post('/register', registerAdmin);

// Protected routes (Requires valid JWT Bearer Token)
router.get('/me', protectAdmin, getAdminProfile);
router.put('/profile', protectAdmin, updateAdminProfile);
router.put('/change-password', protectAdmin, changeAdminPassword);

export default router;
