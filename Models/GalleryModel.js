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
      validate: {
        validator(value) {
          try {
            return ['http:', 'https:'].includes(new URL(value).protocol);
          } catch {
            return false;
          }
        },
        message: 'Gallery photo image URL must be a valid HTTP or HTTPS URL.',
      },
    },
    category: {
      type: String,
      required: [true, 'Gallery photo category is required.'],
      trim: true,
      lowercase: true,
      match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Category must be a lowercase slug.'],
    },
    categoryLabel: {
      type: String,
      trim: true,
      default: '',
      maxlength: 80,
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