import express from 'express';
import {
  getRegisteredMembers,
  getMemberStats,
  getMemberById,
  createMember,
  updateMember,
  deleteMember,
  bulkSeedMembers,
  registerAlumni,
  verifyMembershipNumber,
} from '../Controllers/registeredMemberController.js';

const router = express.Router();

// Verification Endpoint
router.get('/verify/:membershipNo', verifyMembershipNumber);

// Public Alumni Registration Endpoint
router.post('/register', registerAlumni);

// List & Stats
router.get('/', getRegisteredMembers);
router.get('/stats', getMemberStats);

// Bulk Operations
router.post('/bulk-seed', bulkSeedMembers);

// CRUD
router.post('/', createMember);
router.get('/:id', getMemberById);
router.put('/:id', updateMember);
router.delete('/:id', deleteMember);

export default router;
