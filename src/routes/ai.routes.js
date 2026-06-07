import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { generateForm, suggestFields } from '../controllers/ai.controller.js';

const router = Router();

router.post('/generate-form', asyncHandler(generateForm));
router.post('/suggest-fields', asyncHandler(suggestFields));

export default router;
