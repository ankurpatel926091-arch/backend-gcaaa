import express from 'express';
import {
  createWithdrawal,
  getAllWithdrawals,
  getWithdrawalById,
  deleteWithdrawal,
  updateWithdrawal,
} from '../Controllers/withdrawal.controller.js';

const withdrawalRouter = express.Router();

// Create (signature as base64 string in JSON body)
withdrawalRouter.post('/', createWithdrawal);

// Get all (with ?search=&page=&limit=&postNominated=)
withdrawalRouter.get('/', getAllWithdrawals);

// Get by ID
withdrawalRouter.get('/:id', getWithdrawalById);

// Delete
withdrawalRouter.delete('/:id', deleteWithdrawal);
withdrawalRouter.put('/:id', updateWithdrawal);

export default withdrawalRouter;