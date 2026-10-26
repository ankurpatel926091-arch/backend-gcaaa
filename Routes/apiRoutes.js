import express from 'express';
import adminAuthRoutes from './adminAuthRoutes.js';
import registeredMemberRoutes from './registeredMemberRoutes.js';
import batchAlumniRoutes from './batchAlumniRoutes.js';
import electionNominationRoutes from './electionNominationRoutes.js';
import blogRoutes from './blogRoutes.js';
import contactPageRoutes from './contactPageRoutes.js';
import batchRoute from './batch.routes.js';
import galleryRoutes from './galleryRoutes.js';
import withdrawalRouter from './withdrawal.routes.js';

const apiRoutes = express.Router();

// Mount all modular API sub-routes
console.log("-----Api Route wala api start------")
apiRoutes.use('/admin/auth', adminAuthRoutes);
apiRoutes.use('/registered-members', registeredMemberRoutes);
apiRoutes.use('/batch-alumni', batchAlumniRoutes);
apiRoutes.use('/election-nominations', electionNominationRoutes);
apiRoutes.use('/blogs', blogRoutes);
apiRoutes.use('/contact-page', contactPageRoutes);
apiRoutes.use('/batches', batchRoute);
apiRoutes.use('/gallery', galleryRoutes);
apiRoutes.use('/withdrawals', withdrawalRouter);

// Health check endpoint under /api/health
apiRoutes.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'Healthy',
    uptime: `${Math.floor(process.uptime())} seconds`,
    timestamp: new Date().toISOString(),
  });
});
console.log("-----Api Route wala api end------")

// export { apiRoutes };
export default apiRoutes;
