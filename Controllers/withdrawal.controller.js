import mongoose from "mongoose";
import Withdrawal from "../Models/withdrawal.model.js";
import { uploadToCloudinary } from "../Config/cloudinary.js";

// -------------------------------------------------------
// 1. CREATE WITHDRAWAL
// -------------------------------------------------------
export const createWithdrawal = async (req, res) => {
  try {
    const {
      candidateName,
      postNominated,
      proposerName,
      seconderName,
      candidateAddress,
      signature, // base64 data URI
    } = req.body;

    console.log("Received withdrawal data:")

    // Required validation
    if (
      !candidateName ||
      !postNominated ||
      !proposerName ||
      !seconderName ||
      !candidateAddress ||
      !signature
    ) {
      return res.status(400).json({
        success: false,
        message:
          "candidateName, postNominated, proposerName, seconderName, candidateAddress and signature are required",
      });
    }

    // Process signature: upload to Cloudinary if it's base64 or file data
    let uploadedSignatureUrl = signature;

    if (
      signature &&
      (signature.startsWith("data:image") || !signature.startsWith("http"))
    ) {
      const uploadRes = await uploadToCloudinary(
        signature,
        "gcaaa/withdrawals/signatures"
      );
      if (uploadRes) {
        uploadedSignatureUrl = uploadRes; // ✅ सिर्फ URL return होता है
      }
    }

    if (!uploadedSignatureUrl) {
      return res.status(500).json({
        success: false,
        message: "Failed to upload signature to Cloudinary",
      });
    }

    const newWithdrawal = await Withdrawal.create({
      candidateName,
      postNominated,
      proposerName,
      seconderName,
      candidateAddress,
      signature: uploadedSignatureUrl, // ✅ सीधा URL string
    });

    return res.status(201).json({
      success: true,
      message: "Withdrawal submitted successfully",
      data: {
        ...newWithdrawal.toObject(),
        id: newWithdrawal._id.toString(),
      },
    });
  } catch (error) {
    console.error("Error creating withdrawal:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create withdrawal",
      error: error.message,
    });
  }
};

// -------------------------------------------------------
// 2. GET ALL (global search + pagination + filter)
// -------------------------------------------------------
export const getAllWithdrawals = async (req, res) => {
  try {
    const { search = "", page = 1, limit = 10, postNominated } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (pageNum - 1) * limitNum;

    const query = {};

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      query.$or = [
        { candidateName: regex },
        { proposerName: regex },
        { seconderName: regex },
        { candidateAddress: regex },
        { postNominated: regex },
      ];
    }

    if (postNominated) query.postNominated = postNominated;

    const [withdrawals, total] = await Promise.all([
      Withdrawal.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Withdrawal.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      message: "Withdrawals fetched successfully",
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        hasNextPage: pageNum * limitNum < total,
        hasPrevPage: pageNum > 1,
      },
      data: withdrawals.map((w) => ({
        ...w,
        id: w._id.toString(),
      })),
    });
  } catch (error) {
    console.error("Error fetching withdrawals:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch withdrawals",
      error: error.message,
    });
  }
};

// -------------------------------------------------------
// 3. GET WITHDRAWAL BY ID
// -------------------------------------------------------
export const getWithdrawalById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid withdrawal ID" });
    }

    const withdrawal = await Withdrawal.findById(id).lean();
    if (!withdrawal) {
      return res.status(404).json({ success: false, message: "Withdrawal not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Withdrawal fetched successfully",
      data: {
        ...withdrawal,
        id: withdrawal._id.toString(),
      },
    });
  } catch (error) {
    console.error("Error fetching withdrawal:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch withdrawal",
      error: error.message,
    });
  }
};

// -------------------------------------------------------
// 4. DELETE WITHDRAWAL (सिर्फ DB से, Cloudinary destroy नहीं)
// -------------------------------------------------------
export const deleteWithdrawal = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid withdrawal ID" });
    }

    const withdrawal = await Withdrawal.findByIdAndDelete(id);
    if (!withdrawal) {
      return res.status(404).json({ success: false, message: "Withdrawal not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Withdrawal deleted successfully",
      data: {
        ...withdrawal.toObject(),
        id: withdrawal._id.toString(),
      },
    });
  } catch (error) {
    console.error("Error deleting withdrawal:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete withdrawal",
      error: error.message,
    });
  }
};

// -------------------------------------------------------
// 5. UPDATE WITHDRAWAL
// -------------------------------------------------------
export const updateWithdrawal = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid withdrawal ID',
      });
    }

    const withdrawal = await Withdrawal.findById(id);
    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        message: 'Withdrawal not found',
      });
    }

    const {
      candidateName,
      postNominated,
      proposerName,
      seconderName,
      candidateAddress,
      signature, // optional — base64 or URL
    } = req.body;

    // Update text fields (only if provided)
    if (candidateName !== undefined) withdrawal.candidateName = candidateName.trim();
    if (postNominated !== undefined) withdrawal.postNominated = postNominated.trim();
    if (proposerName !== undefined) withdrawal.proposerName = proposerName.trim();
    if (seconderName !== undefined) withdrawal.seconderName = seconderName.trim();
    if (candidateAddress !== undefined)
      withdrawal.candidateAddress = candidateAddress.trim();

    // Update signature if new one provided (base64 or URL)
    if (signature && typeof signature === 'string' && signature.trim()) {
      let newSignatureUrl = signature;

      if (
        signature.startsWith('data:image') ||
        !signature.startsWith('http')
      ) {
        const uploadRes = await uploadToCloudinary(
          signature,
          'gcaaa/withdrawals/signatures'
        );
        if (!uploadRes) {
          return res.status(500).json({
            success: false,
            message: 'Failed to upload new signature to Cloudinary',
          });
        }
        newSignatureUrl = uploadRes;
      }

      withdrawal.signature = newSignatureUrl;
    }

    await withdrawal.save();

    return res.status(200).json({
      success: true,
      message: 'Withdrawal updated successfully',
      data: {
        ...withdrawal.toObject(),
        id: withdrawal._id.toString(),
      },
    });
  } catch (error) {
    console.error('Error updating withdrawal:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update withdrawal',
      error: error.message,
    });
  }
};