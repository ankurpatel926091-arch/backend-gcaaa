import express from 'express';
import {
  submitNomination,
  getAllNominations,
  getNominationById,
  updateNominationStatus,
  deleteNomination,
} from '../Controllers/electionNominationController.js';

const router = express.Router();

router.post('/', submitNomination);
router.get('/', getAllNominations);
router.get('/:id', getNominationById);
router.put('/:id', updateNominationStatus);
router.delete('/:id', deleteNomination);

export default router;
