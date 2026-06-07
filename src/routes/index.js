import { Router } from 'express';
import formRoutes from './form.routes.js';

const router = Router();

// Mount feature routers here as the API grows.
router.use('/forms', formRoutes);

export default router;
