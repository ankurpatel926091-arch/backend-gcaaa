import mongoose from "mongoose";

const withdrawalSchema = new mongoose.Schema(
  {
    candidateName: {
      type: String,
      required: [true, "Candidate name is required"],
      trim: true,
    },
    postNominated: {
      type: String,
      required: [true, "Post nominated is required"],
      trim: true,
    },
    proposerName: {
      type: String,
      required: [true, "Proposer name is required"],
      trim: true,
    },
    seconderName: {
      type: String,
      required: [true, "Seconder name is required"],
      trim: true,
    },
    candidateAddress: {
      type: String,
      required: [true, "Candidate address is required"],
      trim: true,
    },
    signature: {
      type: String, // ✅ सिर्फ URL (blog के image जैसा)
      required: [true, "Signature image is required"],
    },
  },
  { timestamps: true }
);

const Withdrawal = mongoose.model("Withdrawal", withdrawalSchema);
export default Withdrawal;