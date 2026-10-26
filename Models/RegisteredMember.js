import mongoose from 'mongoose';

const registeredMemberSchema = new mongoose.Schema(
  {
    sno: {
      type: Number,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Member name is required'],
      trim: true,
      index: true,
    },
    membershipNo: {
      type: String,
      required: [true, 'Membership number is required'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    year: {
      type: String,
      trim: true,
      default: '',
    },
    cohort: {
      type: String,
      trim: true,
      default: 'all',
      index: true,
    },
    course: {
      type: String,
      trim: true,
      default: 'Bachelor of Architecture',
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    mobile: {
      type: String,
      trim: true,
      default: '',
    },
    salutation: {
      type: String,
      trim: true,
      default: 'Ar.',
    },
    firstName: {
      type: String,
      trim: true,
      default: '',
    },
    middleName: {
      type: String,
      trim: true,
      default: '',
    },
    lastName: {
      type: String,
      trim: true,
      default: '',
    },
    qualifications: {
      type: [String],
      default: ['B.Arch.'],
    },
    specialisation: {
      type: String,
      trim: true,
      default: '',
    },
    occupation: {
      type: String,
      trim: true,
      default: 'Selfemployed',
    },
    organization: {
      type: String,
      trim: true,
      default: '',
    },
    designation: {
      type: String,
      trim: true,
      default: '',
    },
    officeAddress: {
      street: { type: String, default: '' },
      city: { type: String, default: '' },
      country: { type: String, default: 'India' },
      phone: { type: String, default: '' },
    },
    residenceAddress: {
      street: { type: String, default: '' },
      city: { type: String, default: '' },
      country: { type: String, default: 'India' },
      phone: { type: String, default: '' },
    },
    paymentDetails: {
      mode: { type: String, enum: ['Cheque', 'Cash', 'Online'], default: 'Online' },
      amount: { type: Number, default: 1000 },
      chequeNo: { type: String, default: '' },
      drawnOnBank: { type: String, default: '' },
      chequeDate: { type: String, default: '' },
      transactionRef: { type: String, default: '' },
      paymentProof: { type: String, default: '' },
      paymentProofName: { type: String, default: '' },
    },
    photo: {
      type: String,
      default: '',
    },
    applicantSignature: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['Active', 'Verified', 'Pending', 'In Memoriam', 'Paid'],
      default: 'Pending',
      index: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound text index for high-performance searching by name and membershipNo
registeredMemberSchema.index({ name: 'text', membershipNo: 'text' });

export default mongoose.model('RegisteredMember', registeredMemberSchema);
