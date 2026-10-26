import express from 'express';
import {
  createGalleryPhoto,
  deleteGalleryPhoto,
  getAdminGalleryPhotos,
  getPublishedGalleryPhotos,
  updateGalleryPhoto,
} from '../Controllers/galleryController.js';
import { protectAdmin } from '../Middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', getPublishedGalleryPhotos);
router.get('/admin', protectAdmin, getAdminGalleryPhotos);
router.post('/', protectAdmin, createGalleryPhoto);
router.put('/:id', protectAdmin, updateGalleryPhoto);
router.delete('/:id', protectAdmin, deleteGalleryPhoto);

export default router;
