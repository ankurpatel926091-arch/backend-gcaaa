
import mongoose from 'mongoose';

const batchSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Batch name is required'],
      trim: true,
    },
    year: {
      type: String,
      required: [true, 'Year is required'],
    },
    course: {
      type: String,
      required: [true, 'Course is required'],
      trim: true,
    },
    cohort: {
      type: String,
      required: [true, 'Cohort is required'],
      trim: true,
    },
    isPaid:{
      type: Boolean,
      default: false,
    }
  },
  {
    timestamps: true, // createdAt & updatedAt add karega (optional, hata sakte ho)
  }
);

const Batch = mongoose.model('Batch', batchSchema);

export default Batch;