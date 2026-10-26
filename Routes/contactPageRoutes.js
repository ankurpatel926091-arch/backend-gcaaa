import express from 'express';
import {
  getAdminContactPageContent,
  getContactPageContent,
  updateContactPageContent,
} from '../Controllers/contactPageController.js';
import {
  createContactMessage,
  getContactMessages,
} from '../Controllers/contactMessageController.js';
import { protectAdmin } from '../Middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', getContactPageContent);
router.post('/messages', createContactMessage);
router.get('/messages/admin', getContactMessages);
router.get('/admin', protectAdmin, getAdminContactPageContent);
router.put('/admin', protectAdmin, updateContactPageContent);

export default router;
