import Blog from '../Models/Blog.js';
import { uploadToCloudinary, cloudinary } from '../Config/cloudinary.js';

// Helper for category badge styling
const getCategoryColor = (category) => {
  switch (category) {
    case 'Heritage & Architecture':
      return 'bg-amber-100 text-amber-900 border-amber-200';
    case 'Alumni Reunion':
      return 'bg-red-100 text-red-900 border-red-200';
    case 'Urban Planning':
      return 'bg-emerald-100 text-emerald-900 border-emerald-200';
    case 'Career & Mentorship':
      return 'bg-blue-100 text-blue-900 border-blue-200';
    case 'Archives & Publications':
      return 'bg-purple-100 text-purple-900 border-purple-200';
    case 'Sustainable Design':
      return 'bg-teal-100 text-teal-900 border-teal-200';
    default:
      return 'bg-red-100 text-red-900 border-red-200';
  }
};

/**
 * Public: Get all published blogs with optional search, category, tag, & pagination
 */
export const getPublishedBlogs = async (req, res) => {
  try {
    const { category, search, tag, page = 1, limit = 50 } = req.query;

    const query = { status: 'Published' };

    if (category && category !== 'All' && category !== 'All Categories') {
      query.category = category;
    }

    if (tag) {
      query.tags = { $in: [tag] };
    }

    if (search && search.trim()) {
      const q = search.trim();
      query.$or = [
        { title: { $regex: q, $options: 'i' } },
        { excerpt: { $regex: q, $options: 'i' } },
        { 'author.name': { $regex: q, $options: 'i' } },
        { tags: { $regex: q, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);

    const [blogs, total] = await Promise.all([
      Blog.find(query).sort({ createdAt: -1 }).skip(skip).limit(take).lean(),
      Blog.countDocuments(query),
    ]);

    // Map _id to id for frontend compatibility
    const formattedBlogs = blogs.map((b) => ({
      ...b,
      id: b.slug || b._id.toString(),
      _id: b._id.toString(),
    }));

    return res.status(200).json({
      success: true,
      count: formattedBlogs.length,
      total,
      page: parseInt(page, 10),
      totalPages: Math.ceil(total / take) || 1,
      data: formattedBlogs,
    });
  } catch (error) {
    console.error('Error fetching blogs:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch blogs',
      error: error.message,
    });
  }
};

/**
 * Public: Get single blog by ID or Slug
 */
export const getBlogByIdOrSlug = async (req, res) => {
  try {
    const { idOrSlug } = req.params;

    let blog = null;
    if (idOrSlug.match(/^[0-9a-fA-F]{24}$/)) {
      blog = await Blog.findById(idOrSlug);
    }
    if (!blog) {
      blog = await Blog.findOne({ slug: idOrSlug });
    }

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog article not found',
      });
    }

    // Increment read count
    blog.reads = (blog.reads || 0) + 1;
    await blog.save({ validateBeforeSave: false });

    return res.status(200).json({
      success: true,
      data: {
        ...blog.toObject(),
        id: blog.slug || blog._id.toString(),
      },
    });
  } catch (error) {
    console.error('Error fetching blog details:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch blog details',
      error: error.message,
    });
  }
};

/**
 * Admin: Get all blogs with stats
 */
export const getAllBlogsAdmin = async (req, res) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 }).lean();

    const formattedBlogs = blogs.map((b) => ({
      ...b,
      id: b._id.toString(),
      author: typeof b.author === 'object' ? b.author.name : b.author,
    }));

    const total = blogs.length;
    const published = blogs.filter((b) => b.status === 'Published').length;
    const drafts = blogs.filter((b) => b.status === 'Draft').length;
    const totalReads = blogs.reduce((acc, curr) => acc + (curr.reads || 0), 0);

    return res.status(200).json({
      success: true,
      stats: {
        total,
        published,
        drafts,
        totalReads,
      },
      data: formattedBlogs,
    });
  } catch (error) {
    console.error('Error fetching admin blogs:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch admin blogs',
      error: error.message,
    });
  }
};

/**
 * Admin: Create a new blog
 */
export const createBlog = async (req, res) => {
  try {
    const {
      title,
      slug,
      excerpt,
      content,
      category,
      categoryColor,
      date,
      readTime,
      author,
      image,
      tags,
      featured,
      status,
    } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Title and Content are required',
      });
    }

    // Process image: upload to Cloudinary if it's base64 or file data
    let uploadedImageUrl = image;
    let publicId = '';

    if (image && (image.startsWith('data:image') || !image.startsWith('http'))) {
      const uploadRes = await uploadToCloudinary(image, 'gcaaa/blogs');
      if (uploadRes) {
        uploadedImageUrl = uploadRes;
      }
    }

    if (!uploadedImageUrl) {
      // Default architectural image fallback if none provided
      uploadedImageUrl = 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=800&q=80';
    }

    // Normalize author
    let authorObj = {
      name: 'GCAAA Editorial Board',
      role: 'Secretariat, Alumni Association Lucknow',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    };

    if (typeof author === 'string') {
      authorObj.name = author;
    } else if (author && typeof author === 'object') {
      authorObj = { ...authorObj, ...author };
    }

    // Normalize tags
    let tagsArray = [];
    if (Array.isArray(tags)) {
      tagsArray = tags;
    } else if (typeof tags === 'string') {
      tagsArray = tags.split(',').map((t) => t.trim()).filter(Boolean);
    }

    // Create unique slug
    let baseSlug = (slug || title)
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const existingSlug = await Blog.findOne({ slug: baseSlug });
    if (existingSlug) {
      baseSlug = `${baseSlug}-${Date.now().toString().slice(-4)}`;
    }

    const newBlog = new Blog({
      title,
      slug: baseSlug,
      excerpt: excerpt || title,
      content,
      category: category || 'Heritage & Architecture',
      categoryColor: categoryColor || getCategoryColor(category),
      date: date || undefined,
      readTime: readTime || '5 min read',
      author: authorObj,
      image: uploadedImageUrl,
      cloudinaryPublicId: publicId,
      tags: tagsArray,
      featured: Boolean(featured),
      status: status || 'Published',
      reads: 0,
    });

    await newBlog.save();

    return res.status(201).json({
      success: true,
      message: 'Blog created successfully',
      data: {
        ...newBlog.toObject(),
        id: newBlog._id.toString(),
      },
    });
  } catch (error) {
    console.error('Error creating blog:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create blog',
      error: error.message,
    });
  }
};

/**
 * Admin: Update an existing blog
 */
export const updateBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const blog = await Blog.findById(id);
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found',
      });
    }

    // If new base64 image provided, upload to Cloudinary
    if (updates.image && updates.image.startsWith('data:image')) {
      const uploadRes = await uploadToCloudinary(updates.image, 'gcaaa/blogs');
      if (uploadRes) {
        updates.image = uploadRes;
      }
    }

    // If author provided as string
    if (typeof updates.author === 'string') {
      updates.author = {
        ...blog.author,
        name: updates.author,
      };
    }

    // If tags provided as comma string
    if (typeof updates.tags === 'string') {
      updates.tags = updates.tags.split(',').map((t) => t.trim()).filter(Boolean);
    }

    if (updates.category && !updates.categoryColor) {
      updates.categoryColor = getCategoryColor(updates.category);
    }

    Object.assign(blog, updates);
    await blog.save();

    return res.status(200).json({
      success: true,
      message: 'Blog updated successfully',
      data: {
        ...blog.toObject(),
        id: blog._id.toString(),
      },
    });
  } catch (error) {
    console.error('Error updating blog:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update blog',
      error: error.message,
    });
  }
};

/**
 * Admin: Toggle blog status between Published & Draft
 */
export const toggleBlogStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const blog = await Blog.findById(id);
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found',
      });
    }

    blog.status = blog.status === 'Published' ? 'Draft' : 'Published';
    await blog.save({ validateBeforeSave: false });

    return res.status(200).json({
      success: true,
      message: `Blog status updated to ${blog.status}`,
      status: blog.status,
    });
  } catch (error) {
    console.error('Error toggling blog status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to toggle blog status',
      error: error.message,
    });
  }
};

/**
 * Admin: Delete a blog
 */
export const deleteBlog = async (req, res) => {
  try {
    const { id } = req.params;

    const blog = await Blog.findByIdAndDelete(id);
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Blog deleted successfully',
      id,
    });
  } catch (error) {
    console.error('Error deleting blog:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete blog',
      error: error.message,
    });
  }
};
