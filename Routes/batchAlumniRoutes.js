import express from 'express';
import {
  getBatchAlumni,
  getBatchAlumniStats,
  getBatchAlumnusById,
  createBatchAlumnus,
  updateBatchAlumnus,
  deleteBatchAlumnus,
} from '../Controllers/batchAlumniController.js';

const router = express.Router();

router.get('/stats', getBatchAlumniStats);
router.get('/', getBatchAlumni);
router.post('/', createBatchAlumnus);
router.get('/:id', getBatchAlumnusById);
router.put('/:id', updateBatchAlumnus);
router.delete('/:id', deleteBatchAlumnus);

export default router;
