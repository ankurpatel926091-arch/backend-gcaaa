import mongoose from 'mongoose';
import GalleryModel from '../Models/GalleryModel.js';

const editableFields = [
  'title',
  'subtitle',
  'imageUrl',
  'category',
  'categoryLabel',
  'badge',
  'sortOrder',
  'isPublished',
];

const getEditableFields = (body) =>
  Object.fromEntries(
    editableFields
      .filter((field) => Object.hasOwn(body, field))
      .map((field) => [field, body[field]])
  );

const hasValidBody = (body) =>
  body !== null && typeof body === 'object' && !Array.isArray(body);

const formatGalleryPhoto = (photo) => ({
  ...photo,
  id: photo._id.toString(),
  _id: photo._id.toString(),
});

export const getPublishedGalleryPhotos = async (req, res) => {
  try {
    const photos = await GalleryModel.find({ isPublished: true })
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: photos.length,
      data: photos.map(formatGalleryPhoto),
    });
  } catch (error) {
    console.error('Error fetching gallery photos:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch gallery photos.',
    });
  }
};

export const getAdminGalleryPhotos = async (req, res) => {
  try {
    const photos = await GalleryModel.find()
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: photos.length,
      data: photos.map(formatGalleryPhoto),
    });
  } catch (error) {
    console.error('Error fetching admin gallery photos:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch gallery photos.',
    });
  }
};

export const createGalleryPhoto = async (req, res) => {
  if (!hasValidBody(req.body)) {
    return res.status(400).json({ success: false, message: 'A JSON object is required.' });
  }

  try {
    const photo = await GalleryModel.create(getEditableFields(req.body));
    return res.status(201).json({
      success: true,
      message: 'Gallery photo created successfully.',
      data: formatGalleryPhoto(photo.toObject()),
    });
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.error('Error creating gallery photo:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create gallery photo.',
    });
  }
};

export const updateGalleryPhoto = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid gallery photo ID.' });
  }
  if (!hasValidBody(req.body)) {
    return res.status(400).json({ success: false, message: 'A JSON object is required.' });
  }

  try {
    const photo = await GalleryModel.findByIdAndUpdate(
      req.params.id,
      { $set: getEditableFields(req.body) },
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
    });
  }
};

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
    });
  }
};
