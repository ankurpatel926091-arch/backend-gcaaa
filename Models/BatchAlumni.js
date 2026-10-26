import mongoose from 'mongoose';

const batchAlumniSchema = new mongoose.Schema(
  {
    sno: {
      type: Number,
      index: true,
    },
    year: {
      type: String,
      trim: true,
      index: true,
      default: '',
    },
    name: {
      type: String,
      required: [true, 'Alumnus name is required'],
      trim: true,
      index: true,
    },
    membershipNo: {
      type: String,
      trim: true,
      uppercase: true,
      index: true,
      default: '',
    },
    cohort: {
      type: String,
      trim: true,
      default: 'all',
      enum: ['all', 'b-arch', 'b1985', 'm-arch', 'murp', 'miend', 'mind'],
      index: true,
    },
    course: {
      type: String,
      trim: true,
      default: 'Bachelor of Architecture & Foundation (Prior to 1985 - 2025)',
    },
    batchNo: {
      type: String,
      trim: true,
      default: '',
    },
    email: {
      type: String,
      trim: true,
      default: '',
    },
    mobile: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['Paid', 'Pending', 'In Memoriam', 'Active'],
      default: 'Paid',
      index: true,
    },
    deceased: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Search index for fast lookup
batchAlumniSchema.index({ name: 'text', membershipNo: 'text' });

export default mongoose.model('BatchAlumni', batchAlumniSchema);
