import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { generateForm, suggestFields } from '../controllers/ai.controller.js';

const router = Router();

// AI features require a signed-in user.
router.post('/generate-form', requireAuth, asyncHandler(generateForm));
router.post('/suggest-fields', requireAuth, asyncHandler(suggestFields));

export default router;
