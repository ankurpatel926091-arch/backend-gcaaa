import express from 'express';
import {
  getPublishedBlogs,
  getBlogByIdOrSlug,
  getAllBlogsAdmin,
  createBlog,
  updateBlog,
  toggleBlogStatus,
  deleteBlog,
} from '../Controllers/blogController.js';

const router = express.Router();

// Public routes (for Website frontend)
router.get('/', getPublishedBlogs);
router.get('/:idOrSlug', getBlogByIdOrSlug);

// Admin routes (for Admin Panel)
router.get('/admin/all', getAllBlogsAdmin);
router.post('/', createBlog);
router.put('/:id', updateBlog);
router.patch('/:id/status', toggleBlogStatus);
router.delete('/:id', deleteBlog);

export default router;
