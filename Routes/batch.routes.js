import express from 'express';
import { createBatch, deleteBatch, getAllBatches, getBatchById, getFilterOptions, updateBatch } from '../Controllers/batch.controller.js';


const batchRoute = express.Router();

batchRoute.post('/', createBatch);
batchRoute.get('/', getAllBatches);
batchRoute.get('/filter-options', getFilterOptions); 
batchRoute.get('/:id', getBatchById);
batchRoute.put('/:id', updateBatch);
batchRoute.delete('/:id', deleteBatch);

export default batchRoute;