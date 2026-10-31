import express from 'express';
import {
  createGalleryPhoto,
  deleteGalleryPhoto,
  getAdminGalleryPhotos,
  getPublishedGalleryPhotos,
  updateGalleryPhoto,
} from '../Controllers/galleryController.js';

const router = express.Router();

// Public routes (for Website frontend)
router.get('/', getPublishedGalleryPhotos);

// Admin routes (for Admin Panel)
router.get('/admin', getAdminGalleryPhotos);
router.get('/admin/all', getAdminGalleryPhotos);
router.post('/', createGalleryPhoto);
router.put('/:id', updateGalleryPhoto);
router.delete('/:id', deleteGalleryPhoto);

export default router;
