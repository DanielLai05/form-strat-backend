import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  listForms,
  getForm,
  createForm,
  updateForm,
  deleteForm,
  listSubmissions,
  createSubmission,
} from '../controllers/form.controller.js';

const router = Router();

router.route('/').get(asyncHandler(listForms)).post(asyncHandler(createForm));

router
  .route('/:id')
  .get(asyncHandler(getForm))
  .patch(asyncHandler(updateForm))
  .delete(asyncHandler(deleteForm));

router
  .route('/:id/submissions')
  .get(asyncHandler(listSubmissions))
  .post(asyncHandler(createSubmission));

export default router;
