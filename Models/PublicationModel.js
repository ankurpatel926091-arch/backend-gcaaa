import mongoose from 'mongoose';

const sectionSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, default: '' },
    desc: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const publicationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Publication title is required.'],
      trim: true,
      maxlength: 250,
    },
    tagline: {
      type: String,
      trim: true,
      default: '',
      maxlength: 300,
    },
    edition: {
      type: String,
      trim: true,
      default: '',
      maxlength: 120,
    },
    sectionNumber: {
      type: String,
      trim: true,
      default: '01',
    },
    badge: {
      type: String,
      trim: true,
      default: '',
      maxlength: 120,
    },
    badgeColor: {
      type: String,
      trim: true,
      default: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    coverImg: {
      type: String,
      trim: true,
      default: '',
    },
    pdfUrl: {
      type: String,
      trim: true,
      default: '',
    },
    downloadFilename: {
      type: String,
      trim: true,
      default: '',
    },
    pages: {
      type: Number,
      default: 0,
      min: 0,
    },
    fileSize: {
      type: String,
      trim: true,
      default: '',
    },
    year: {
      type: String,
      trim: true,
      default: '',
    },
    publisher: {
      type: String,
      trim: true,
      default: 'Alumni Association, Government College of Architecture Lucknow (GCAAA)',
    },
    theme: {
      type: String,
      trim: true,
      default: 'red',
    },
    highlights: {
      type: [String],
      default: [],
    },
    sectionsCovered: {
      type: [sectionSchema],
      default: [],
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const PublicationModel = mongoose.model('Publication', publicationSchema);

export default PublicationModel;
