import mongoose from 'mongoose';

const electionNominationSchema = new mongoose.Schema(
  {
    nominationId: {
      type: String,
      unique: true,
      index: true,
    },
    term: {
      type: String,
      default: '2026-2028',
      trim: true,
    },
    post: {
      type: String,
      required: [true, 'Post applied for is required'],
      trim: true,
      index: true,
    },
    candidate: {
      fullName: {
        type: String,
        required: [true, 'Candidate full name is required'],
        trim: true,
      },
      mobile: {
        type: String,
        required: [true, 'Candidate mobile number is required'],
        trim: true,
      },
      email: {
        type: String,
        required: [true, 'Candidate email is required'],
        trim: true,
        lowercase: true,
      },
      address: {
        type: String,
        required: [true, 'Candidate address is required'],
        trim: true,
      },
      membershipNo: {
        type: String,
        required: [true, 'Candidate GCAAA membership number is required'],
        trim: true,
        uppercase: true,
      },
      photo: {
        type: String,
        default: '',
      },
      signature: {
        type: String,
        default: '',
      },
    },
    proposer: {
      fullName: {
        type: String,
        required: [true, 'Proposer full name is required'],
        trim: true,
      },
      mobile: {
        type: String,
        required: [true, 'Proposer mobile number is required'],
        trim: true,
      },
      email: {
        type: String,
        trim: true,
        lowercase: true,
        default: '',
      },
      address: {
        type: String,
        required: [true, 'Proposer address is required'],
        trim: true,
      },
      membershipNo: {
        type: String,
        required: [true, 'Proposer GCAAA membership number is required'],
        trim: true,
        uppercase: true,
      },
      photo: {
        type: String,
        default: '',
      },
      signature: {
        type: String,
        default: '',
      },
    },
    seconder: {
      fullName: {
        type: String,
        required: [true, 'Seconder full name is required'],
        trim: true,
      },
      mobile: {
        type: String,
        required: [true, 'Seconder mobile number is required'],
        trim: true,
      },
      email: {
        type: String,
        trim: true,
        lowercase: true,
        default: '',
      },
      address: {
        type: String,
        required: [true, 'Seconder address is required'],
        trim: true,
      },
      membershipNo: {
        type: String,
        required: [true, 'Seconder GCAAA membership number is required'],
        trim: true,
        uppercase: true,
      },
      photo: {
        type: String,
        default: '',
      },
      signature: {
        type: String,
        default: '',
      },
    },
    declarationAgreed: {
      type: Boolean,
      required: [true, 'Declaration agreement is mandatory'],
      default: false,
    },
    status: {
      type: String,
      enum: ['Submitted', 'Under Review', 'Verified', 'Approved', 'Rejected'],
      default: 'Submitted',
      index: true,
    },
    remarks: {
      type: String,
      default: '',
      trim: true,
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

// Auto generate nomination ID before save if not present
electionNominationSchema.pre('save', function () {
  if (!this.nominationId) {
    const year = new Date().getFullYear();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    this.nominationId = `GCA-NOM-${year}-${randomSuffix}`;
  }
});

export default mongoose.model('ElectionNomination', electionNominationSchema);
