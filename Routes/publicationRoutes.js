import express from 'express';
import {
  getPublishedPublications,
  getAdminPublications,
  getPublicationById,
  streamPublicationPdf,
  uploadPublicationPdf,
  pdfUploadMiddleware,
  createPublication,
  updatePublication,
  deletePublication,
} from '../Controllers/publicationController.js';

const router = express.Router();

// Public routes (for Website frontend)
router.get('/', getPublishedPublications);
router.get('/pdf/:id', streamPublicationPdf);

// Admin routes (for Admin Panel)
router.get('/admin', getAdminPublications);
router.get('/admin/all', getAdminPublications);
router.get('/:id', getPublicationById);
router.post('/upload-pdf', pdfUploadMiddleware, uploadPublicationPdf);
router.post('/', createPublication);
router.put('/:id', updatePublication);
router.delete('/:id', deletePublication);

export default router;
