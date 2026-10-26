import ElectionNomination from '../Models/ElectionNomination.js';
import RegisteredMember from '../Models/RegisteredMember.js';
import { uploadToCloudinary } from '../Config/cloudinary.js';
import { sendElectionNominationReceiptEmail } from '../Utils/emailService.js';

/**
 * Helper to upload image (base64 data URI) to Cloudinary or keep as is
 */
async function processPhotoUpload(photoData, folder = 'gcaaa/election_nominations') {
  if (!photoData || typeof photoData !== 'string') return '';
  if (photoData.startsWith('http://') || photoData.startsWith('https://')) {
    return photoData;
  }
  if (photoData.startsWith('data:image')) {
    try {
      const resultUrl = await uploadToCloudinary(photoData, folder);
      if (resultUrl) {
        console.log(`[Cloudinary] Successfully uploaded image to folder '${folder}':`, resultUrl);
        return resultUrl;
      }
      console.warn(`[Cloudinary] Returned empty URL for folder '${folder}', saving provided data`);
      return photoData;
    } catch (err) {
      console.warn('[Cloudinary] Upload error, keeping provided data:', err.message);
      return photoData;
    }
  }
  return photoData;
}

/**
 * @desc    Submit a new election nomination
 * @route   POST /api/election-nominations
 * @access  Public
 */
export const submitNomination = async (req, res) => {
  try {
    const {
      term = '2026-2028',
      post,
      candidate,
      proposer,
      seconder,
      declarationAgreed,
    } = req.body;

    // Validate Post
    if (!post || !String(post).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please select the post you are applying for',
      });
    }

    // Validate Candidate Information
    if (!candidate?.fullName?.trim()) {
      return res.status(400).json({ success: false, message: 'Candidate Full Name is required' });
    }
    if (!candidate?.mobile?.trim()) {
      return res.status(400).json({ success: false, message: 'Candidate Mobile Number is required' });
    }
    if (!candidate?.email?.trim()) {
      return res.status(400).json({ success: false, message: 'Candidate Email is required' });
    }
    if (!candidate?.address?.trim()) {
      return res.status(400).json({ success: false, message: 'Candidate Address is required' });
    }
    if (!candidate?.membershipNo?.trim()) {
      return res.status(400).json({ success: false, message: 'Candidate GCAAA Membership Number is required' });
    }
    if (!candidate?.photo) {
      return res.status(400).json({ success: false, message: 'Candidate Photograph is required' });
    }

    // Validate Proposer Information
    if (!proposer?.fullName?.trim()) {
      return res.status(400).json({ success: false, message: 'Proposer Full Name is required' });
    }
    if (!proposer?.mobile?.trim()) {
      return res.status(400).json({ success: false, message: 'Proposer Mobile Number is required' });
    }
    if (!proposer?.address?.trim()) {
      return res.status(400).json({ success: false, message: 'Proposer Address is required' });
    }
    if (!proposer?.membershipNo?.trim()) {
      return res.status(400).json({ success: false, message: 'Proposer GCAAA Membership Number is required' });
    }

    // Validate Seconder Information
    if (!seconder?.fullName?.trim()) {
      return res.status(400).json({ success: false, message: 'Seconder Full Name is required' });
    }
    if (!seconder?.mobile?.trim()) {
      return res.status(400).json({ success: false, message: 'Seconder Mobile Number is required' });
    }
    if (!seconder?.address?.trim()) {
      return res.status(400).json({ success: false, message: 'Seconder Address is required' });
    }
    if (!seconder?.membershipNo?.trim()) {
      return res.status(400).json({ success: false, message: 'Seconder GCAAA Membership Number is required' });
    }

    // Validate Declaration
    if (!declarationAgreed) {
      return res.status(400).json({
        success: false,
        message: 'You must agree to the declaration statement to submit nomination',
      });
    }

    // 1. Verify Uniqueness among Candidate, Proposer, and Seconder
    const candNo = candidate.membershipNo.trim().toUpperCase();
    const propNo = proposer.membershipNo.trim().toUpperCase();
    const secNo = seconder.membershipNo.trim().toUpperCase();

    if (candNo === propNo) {
      return res.status(400).json({
        success: false,
        message: 'Candidate and Proposer cannot have the same GCAAA Membership Number.',
      });
    }
    if (candNo === secNo) {
      return res.status(400).json({
        success: false,
        message: 'Candidate and Seconder cannot have the same GCAAA Membership Number.',
      });
    }
    if (propNo === secNo) {
      return res.status(400).json({
        success: false,
        message: 'Proposer and Seconder cannot have the same GCAAA Membership Number.',
      });
    }

    // 2. Verify all 3 membership numbers exist in the RegisteredMember database
    const escapeRegex = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const [candMember, propMember, secMember] = await Promise.all([
      RegisteredMember.findOne({ membershipNo: { $regex: new RegExp(`^${escapeRegex(candNo)}$`, 'i') } }),
      RegisteredMember.findOne({ membershipNo: { $regex: new RegExp(`^${escapeRegex(propNo)}$`, 'i') } }),
      RegisteredMember.findOne({ membershipNo: { $regex: new RegExp(`^${escapeRegex(secNo)}$`, 'i') } }),
    ]);

    if (!candMember) {
      return res.status(400).json({
        success: false,
        message: `Candidate GCAAA Membership No. '${candNo}' was not found in registered members records. Please check the directory or enter a valid number.`,
      });
    }

    if (!propMember) {
      return res.status(400).json({
        success: false,
        message: `Proposer GCAAA Membership No. '${propNo}' was not found in registered members records.`,
      });
    }

    if (!secMember) {
      return res.status(400).json({
        success: false,
        message: `Seconder GCAAA Membership No. '${secNo}' was not found in registered members records.`,
      });
    }

    // Process photo and signature uploads
    let candidatePhotoUrl = '';
    let candidateSignatureUrl = '';
    let proposerPhotoUrl = '';
    let seconderPhotoUrl = '';

    try {
      [candidatePhotoUrl, candidateSignatureUrl, proposerPhotoUrl, seconderPhotoUrl] = await Promise.all([
        processPhotoUpload(candidate.photo, 'gcaaa/election/candidates'),
        processPhotoUpload(candidate.signature, 'gcaaa/election/candidates/signatures'),
        processPhotoUpload(proposer.photo, 'gcaaa/election/proposers'),
        processPhotoUpload(seconder.photo, 'gcaaa/election/seconders'),
      ]);
    } catch (e) {
      console.warn('Error during photo upload processing:', e.message);
      candidatePhotoUrl = candidate.photo || '';
      candidateSignatureUrl = candidate.signature || '';
      proposerPhotoUrl = proposer.photo || '';
      seconderPhotoUrl = seconder.photo || '';
    }

    // Generate custom nomination ID
    const totalCount = await ElectionNomination.countDocuments();
    const nominationId = `GCA-NOM-2026-${String(totalCount + 101).padStart(4, '0')}`;

    const newNomination = await ElectionNomination.create({
      nominationId,
      term: term || '2026-2028',
      post: post.trim(),
      candidate: {
        fullName: candidate.fullName.trim(),
        mobile: candidate.mobile.trim(),
        email: candidate.email.trim().toLowerCase(),
        address: candidate.address.trim(),
        membershipNo: candidate.membershipNo.trim().toUpperCase(),
        photo: candidatePhotoUrl,
        signature: candidateSignatureUrl,
      },
      proposer: {
        fullName: proposer.fullName.trim(),
        mobile: proposer.mobile.trim(),
        email: proposer.email ? proposer.email.trim().toLowerCase() : '',
        address: proposer.address.trim(),
        membershipNo: proposer.membershipNo.trim().toUpperCase(),
        photo: proposerPhotoUrl,
      },
      seconder: {
        fullName: seconder.fullName.trim(),
        mobile: seconder.mobile.trim(),
        email: seconder.email ? seconder.email.trim().toLowerCase() : '',
        address: seconder.address.trim(),
        membershipNo: seconder.membershipNo.trim().toUpperCase(),
        photo: seconderPhotoUrl,
      },
      declarationAgreed: true,
      status: 'Submitted',
    });

    // Return success response immediately to user without blocking on PDF/SMTP email
    res.status(201).json({
      success: true,
      message: 'Election Nomination Form submitted successfully!',
      nominationId: newNomination.nominationId,
      data: newNomination,
    });

    // Send nomination receipt email asynchronously in background
    setImmediate(async () => {
      try {
        console.log(`[electionNominationController] 🚀 Sending nomination receipt email to: ${newNomination.candidate?.email}`);
        const emailResult = await sendElectionNominationReceiptEmail(newNomination);
        console.log('[electionNominationController] 📩 Email dispatch result:', emailResult);
      } catch (emailErr) {
        console.error('[electionNominationController] ❌ Error dispatching nomination receipt email:', emailErr.message);
      }
    });

    return;
  } catch (error) {
    console.error('Error submitting election nomination:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to submit election nomination form',
      error: error.message,
    });
  }
};

/**
 * @desc    Get all nominations (with optional search/filters)
 * @route   GET /api/election-nominations
 * @access  Public / Admin
 */
export const getAllNominations = async (req, res) => {
  try {
    const { post, status, search } = req.query;
    const filter = { isDeleted: { $ne: true } };

    if (post) filter.post = post;
    if (status) filter.status = status;
    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { nominationId: regex },
        { 'candidate.fullName': regex },
        { 'candidate.membershipNo': regex },
        { 'candidate.mobile': regex },
        { 'candidate.email': regex },
      ];
    }

    const nominations = await ElectionNomination.find(filter).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: nominations.length,
      data: nominations,
    });
  } catch (error) {
    console.error('Error fetching nominations:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch nominations',
      error: error.message,
    });
  }
};

/**
 * @desc    Get nomination by ID or Reference
 * @route   GET /api/election-nominations/:id
 * @access  Public
 */
export const getNominationById = async (req, res) => {
  try {
    const { id } = req.params;
    const nomination = await ElectionNomination.findOne({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { nominationId: id }],
      isDeleted: { $ne: true },
    });

    if (!nomination) {
      return res.status(404).json({
        success: false,
        message: 'Nomination record not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: nomination,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching nomination details',
      error: error.message,
    });
  }
};

/**
 * @desc    Update nomination status / remarks (Admin)
 * @route   PUT /api/election-nominations/:id
 * @access  Admin
 */
export const updateNominationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body;

    const nomination = await ElectionNomination.findOne({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { nominationId: id }],
      isDeleted: { $ne: true },
    });

    if (!nomination) {
      return res.status(404).json({
        success: false,
        message: 'Nomination record not found',
      });
    }

    if (status) nomination.status = status;
    if (remarks !== undefined) nomination.remarks = remarks;

    await nomination.save();

    return res.status(200).json({
      success: true,
      message: 'Nomination status updated successfully',
      data: nomination,
    });
  } catch (error) {
    console.error('Error updating nomination status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update nomination status',
      error: error.message,
    });
  }
};

/**
 * @desc    Delete nomination (Admin - Soft Delete)
 * @route   DELETE /api/election-nominations/:id
 * @access  Admin
 */
export const deleteNomination = async (req, res) => {
  try {
    const { id } = req.params;
    const nomination = await ElectionNomination.findOneAndUpdate(
      { $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { nominationId: id }] },
      { isDeleted: true, deletedAt: new Date() },
      { new: true }
    );

    if (!nomination) {
      return res.status(404).json({
        success: false,
        message: 'Nomination record not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Nomination record soft-deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting nomination:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete nomination record',
      error: error.message,
    });
  }
};

export default {
  submitNomination,
  getAllNominations,
  getNominationById,
  updateNominationStatus,
  deleteNomination,
};
