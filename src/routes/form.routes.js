import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import {
  listForms,
  getForm,
  createForm,
  updateForm,
  deleteForm,
  listSubmissions,
  createSubmission,
} from '../controllers/form.controller.js';
import { getAnalytics } from '../controllers/analytics.controller.js';

const router = Router();

// Owner-only: manage your forms.
router.get('/', requireAuth, asyncHandler(listForms));
router.post('/', requireAuth, asyncHandler(createForm));

// Public: anyone with the link can view a form to fill it out.
router.get('/:id', asyncHandler(getForm));

// Owner-only: edit/delete.
router.patch('/:id', requireAuth, asyncHandler(updateForm));
router.delete('/:id', requireAuth, asyncHandler(deleteForm));

// Submissions: listing is owner-only; submitting is public.
router.get('/:id/submissions', requireAuth, asyncHandler(listSubmissions));
router.post('/:id/submissions', asyncHandler(createSubmission));

// Owner-only: analytics.
router.get('/:id/analytics', requireAuth, asyncHandler(getAnalytics));

export default router;
