import mongoose from 'mongoose';

const gallerySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Gallery photo title is required.'],
      trim: true,
      maxlength: 160,
    },
    subtitle: {
      type: String,
      trim: true,
      default: '',
      maxlength: 300,
    },
    imageUrl: {
      type: String,
      required: [true, 'Gallery photo image URL is required.'],
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Gallery photo category is required.'],
      trim: true,
      lowercase: true,
      default: 'general',
    },
    categoryLabel: {
      type: String,
      trim: true,
      default: '',
      maxlength: 80,
    },
    album: {
      type: String,
      trim: true,
      default: '',
    },
    date: {
      type: String,
      trim: true,
      default: '',
    },
    badge: {
      type: String,
      trim: true,
      default: '',
      maxlength: 80,
    },
    sortOrder: {
      type: Number,
      default: 0,
      min: 0,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const GalleryModel = mongoose.model('GalleryPhoto', gallerySchema);

export default GalleryModel;
