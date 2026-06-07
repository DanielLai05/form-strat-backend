import { Router } from 'express';
import formRoutes from './form.routes.js';
import aiRoutes from './ai.routes.js';

const router = Router();

// Mount feature routers here as the API grows.
router.use('/forms', formRoutes);
router.use('/ai', aiRoutes);

export default router;
