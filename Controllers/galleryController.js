import mongoose from 'mongoose';
import GalleryModel from '../Models/GalleryModel.js';
import { uploadToCloudinary } from '../Config/cloudinary.js';

const slugify = (text) =>
  (text || '')
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');

const normalizeCategory = (cat = '', alb = '') => {
  const combined = `${cat} ${alb}`.toLowerCase();
  if (combined.includes('gbm')) {
    return {
      category: 'gbm',
      categoryLabel: 'GBM 2025',
      album: 'GBM 2025',
    };
  }
  if (combined.includes('dharohar') || combined.includes('reunion')) {
    return {
      category: 'dharohar',
      categoryLabel: 'Dharohar & Reunions',
      album: 'Dharohar & Reunions',
    };
  }
  const slug = slugify(cat || alb || 'general');
  return {
    category: slug,
    categoryLabel: alb || cat || 'General',
    album: alb || cat || 'General',
  };
};

const formatGalleryPhoto = (photo) => {
  const plain = photo && typeof photo.toObject === 'function' ? photo.toObject() : photo;
  const id = plain._id ? plain._id.toString() : plain.id;
  const norm = normalizeCategory(plain.category, plain.album || plain.categoryLabel);
  return {
    ...plain,
    id,
    _id: id,
    caption: plain.title || plain.caption || '',
    title: plain.title || plain.caption || '',
    src: plain.imageUrl,
    url: plain.imageUrl,
    album: norm.album,
    category: norm.category,
    categoryLabel: norm.categoryLabel,
  };
};

/**
 * Public: Get published gallery photos with backend filtering and pagination
 */
export const getPublishedGalleryPhotos = async (req, res) => {
  try {
    const { category, search, page, limit } = req.query;

    const query = { isPublished: { $ne: false } };

    // Category filter
    if (category && category !== 'all' && category !== 'All Photos') {
      const norm = normalizeCategory(category, category);
      query.$or = [
        { category: norm.category },
        { category: category },
        { album: category },
        { categoryLabel: category },
      ];
    }

    // Search query
    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { title: regex },
        { subtitle: regex },
        { album: regex },
        { categoryLabel: regex },
      ];
    }

    const total = await GalleryModel.countDocuments(query);

    // Dynamic category tabs and counts across all published items
    const allPublished = await GalleryModel.find({ isPublished: { $ne: false } })
      .select('category categoryLabel album')
      .lean();

    const categoryMap = new Map();
    categoryMap.set('all', { key: 'all', label: 'All Photos', count: allPublished.length });
    categoryMap.set('gbm', { key: 'gbm', label: 'GBM 2025', count: 0 });
    categoryMap.set('dharohar', { key: 'dharohar', label: 'Dharohar & Reunions', count: 0 });

    allPublished.forEach((item) => {
      const norm = normalizeCategory(item.category, item.album || item.categoryLabel);
      const key = norm.category;
      if (!categoryMap.has(key)) {
        categoryMap.set(key, { key, label: norm.categoryLabel, count: 0 });
      }
      categoryMap.get(key).count += 1;
    });

    let photosQuery = GalleryModel.find(query).sort({ sortOrder: 1, createdAt: -1 });

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    if (pageNum > 0 && limitNum > 0) {
      const skip = (pageNum - 1) * limitNum;
      photosQuery = photosQuery.skip(skip).limit(limitNum);
    }

    const photos = await photosQuery.lean();
    const formattedPhotos = photos.map(formatGalleryPhoto);

    const totalPages = limitNum > 0 ? Math.ceil(total / limitNum) : 1;

    return res.status(200).json({
      success: true,
      count: formattedPhotos.length,
      data: formattedPhotos,
      pagination: {
        total,
        page: pageNum || 1,
        limit: limitNum || total,
        totalPages,
        hasNextPage: pageNum > 0 && limitNum > 0 ? pageNum < totalPages : false,
        hasPrevPage: pageNum > 1,
      },
      categories: Array.from(categoryMap.values()),
    });
  } catch (error) {
    console.error('Error fetching gallery photos:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch gallery photos.',
      error: error.message,
    });
  }
};

/**
 * Admin: Get all gallery photos with stats and filtering
 */
export const getAdminGalleryPhotos = async (req, res) => {
  try {
    const { album, search, page, limit } = req.query;

    const query = {};

    if (album && album !== 'All Albums' && album !== 'All Photos' && album !== 'all') {
      const norm = normalizeCategory(album, album);
      query.$or = [
        { album: album },
        { album: norm.album },
        { category: norm.category },
        { categoryLabel: album },
      ];
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { title: regex },
        { subtitle: regex },
        { album: regex },
        { categoryLabel: regex },
      ];
    }

    const total = await GalleryModel.countDocuments(query);

    // Compute admin KPI stats
    const allPhotos = await GalleryModel.find().select('album category isPublished').lean();
    const totalPhotos = allPhotos.length;
    const albumSet = new Set();
    let gbmCount = 0;
    let dharoharCount = 0;

    allPhotos.forEach((p) => {
      const norm = normalizeCategory(p.category, p.album);
      if (norm.album) albumSet.add(norm.album);
      if (norm.category === 'gbm') gbmCount++;
      if (norm.category === 'dharohar') dharoharCount++;
    });

    let photosQuery = GalleryModel.find(query).sort({ sortOrder: 1, createdAt: -1 });

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    if (pageNum > 0 && limitNum > 0) {
      const skip = (pageNum - 1) * limitNum;
      photosQuery = photosQuery.skip(skip).limit(limitNum);
    }

    const photos = await photosQuery.lean();

    return res.status(200).json({
      success: true,
      data: photos.map(formatGalleryPhoto),
      stats: {
        totalPhotos,
        albumCount: albumSet.size,
        publishedCount: allPhotos.filter((p) => p.isPublished !== false).length,
        gbmCount,
        dharoharCount,
      },
      pagination: {
        total,
        page: pageNum || 1,
        limit: limitNum || total,
        totalPages: limitNum > 0 ? Math.ceil(total / limitNum) : 1,
      },
    });
  } catch (error) {
    console.error('Error fetching admin gallery photos:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch gallery photos.',
      error: error.message,
    });
  }
};

/**
 * Admin: Create a new gallery photo with Cloudinary upload
 */
export const createGalleryPhoto = async (req, res) => {
  try {
    const body = req.body;
    if (!body || typeof body !== 'object') {
      return res.status(400).json({ success: false, message: 'A JSON object is required.' });
    }

    const rawImage = body.imageUrl || body.url || body.image;
    if (!rawImage) {
      return res.status(400).json({ success: false, message: 'Image is required.' });
    }

    // Process image: upload to Cloudinary if base64 or file data
    let uploadedImageUrl = rawImage;
    if (rawImage.startsWith('data:image') || !rawImage.startsWith('http')) {
      const cloudUrl = await uploadToCloudinary(rawImage, 'gcaaa/gallery');
      if (!cloudUrl) {
        return res.status(500).json({
          success: false,
          message: 'Failed to upload photo to Cloudinary. Please check image format.',
        });
      }
      uploadedImageUrl = cloudUrl;
    }

    const norm = normalizeCategory(body.category || '', body.album || body.categoryLabel || 'GBM 2025');
    const title = (body.title || body.caption || 'GCAAA Gallery Photograph').trim();
    const album = norm.album;
    const category = norm.category;
    const categoryLabel = norm.categoryLabel;
    const date = (body.date || new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })).trim();

    const photoData = {
      title,
      subtitle: (body.subtitle || '').trim(),
      imageUrl: uploadedImageUrl,
      category,
      categoryLabel,
      album,
      date,
      badge: (body.badge || (category === 'gbm' ? 'GBM 2025' : 'Reunion Classic')).trim(),
      sortOrder: typeof body.sortOrder === 'number' ? body.sortOrder : 0,
      isPublished: body.isPublished !== false,
    };

    const photo = await GalleryModel.create(photoData);

    return res.status(201).json({
      success: true,
      message: 'Gallery photo created successfully.',
      data: formatGalleryPhoto(photo),
    });
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.error('Error creating gallery photo:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create gallery photo.',
      error: error.message,
    });
  }
};

/**
 * Admin: Update gallery photo
 */
export const updateGalleryPhoto = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid gallery photo ID.' });
  }

  try {
    const body = req.body;
    const updateData = {};

    if (body.title || body.caption) {
      updateData.title = (body.title || body.caption).trim();
    }
    if (body.subtitle !== undefined) updateData.subtitle = body.subtitle.trim();
    if (body.album || body.category) {
      const norm = normalizeCategory(body.category || '', body.album || body.categoryLabel || '');
      updateData.album = norm.album;
      updateData.category = norm.category;
      updateData.categoryLabel = norm.categoryLabel;
    }
    if (body.date) updateData.date = body.date.trim();
    if (body.badge !== undefined) updateData.badge = body.badge.trim();
    if (body.sortOrder !== undefined) updateData.sortOrder = Number(body.sortOrder);
    if (body.isPublished !== undefined) updateData.isPublished = Boolean(body.isPublished);

    // Image upload if new image passed
    const rawImage = body.imageUrl || body.url || body.image;
    if (rawImage) {
      if (rawImage.startsWith('data:image') || !rawImage.startsWith('http')) {
        const cloudUrl = await uploadToCloudinary(rawImage, 'gcaaa/gallery');
        if (cloudUrl) {
          updateData.imageUrl = cloudUrl;
        }
      } else {
        updateData.imageUrl = rawImage;
      }
    }

    const photo = await GalleryModel.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean();

    if (!photo) {
      return res.status(404).json({ success: false, message: 'Gallery photo not found.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Gallery photo updated successfully.',
      data: formatGalleryPhoto(photo),
    });
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.error('Error updating gallery photo:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update gallery photo.',
      error: error.message,
    });
  }
};

/**
 * Admin: Delete gallery photo
 */
export const deleteGalleryPhoto = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid gallery photo ID.' });
  }

  try {
    const photo = await GalleryModel.findByIdAndDelete(req.params.id);
    if (!photo) {
      return res.status(404).json({ success: false, message: 'Gallery photo not found.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Gallery photo deleted successfully.',
    });
  } catch (error) {
    console.error('Error deleting gallery photo:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete gallery photo.',
      error: error.message,
    });
  }
};
