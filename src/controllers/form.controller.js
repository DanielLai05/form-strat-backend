import { query } from '../config/db.js';
import { ApiError } from '../utils/ApiError.js';

// Columns returned to clients, aliased to camelCase for the frontend.
const FORM_COLS = `
  id,
  title,
  description,
  fields,
  published,
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`;

/** GET /api/forms — list the signed-in user's forms (newest first). */
export const listForms = async (req, res) => {
  const { rows } = await query(
    `SELECT ${FORM_COLS},
            (SELECT COUNT(*)::int FROM submissions s WHERE s.form_id = f.id) AS "submissionCount"
       FROM forms f
       WHERE f.user_id = $1
       ORDER BY created_at DESC`,
    [req.user.uid]
  );
  res.json({ data: rows });
};

/**
 * GET /api/forms/:id — fetch one form.
 * Public: anyone with the link can load the form to fill it out.
 */
export const getForm = async (req, res) => {
  const { rows } = await query(
    `SELECT ${FORM_COLS} FROM forms WHERE id = $1`,
    [req.params.id]
  );
  if (rows.length === 0) throw ApiError.notFound('Form not found');
  res.json({ data: rows[0] });
};

/** POST /api/forms — create a form owned by the signed-in user. */
export const createForm = async (req, res) => {
  const { title, description, fields, published } = req.body ?? {};

  if (!title || typeof title !== 'string') {
    throw ApiError.badRequest('"title" is required and must be a string');
  }
  if (fields !== undefined && !Array.isArray(fields)) {
    throw ApiError.badRequest('"fields" must be an array');
  }

  const { rows } = await query(
    `INSERT INTO forms (user_id, title, description, fields, published)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING ${FORM_COLS}`,
    [
      req.user.uid,
      title.trim(),
      description ?? null,
      JSON.stringify(fields ?? []),
      Boolean(published),
    ]
  );
  res.status(201).json({ data: rows[0] });
};

/** PATCH /api/forms/:id — update a form the user owns (only provided fields). */
export const updateForm = async (req, res) => {
  const { title, description, fields, published } = req.body ?? {};

  if (fields !== undefined && !Array.isArray(fields)) {
    throw ApiError.badRequest('"fields" must be an array');
  }

  // Build the SET clause dynamically from the fields that were provided.
  const updates = [];
  const values = [];
  let i = 1;

  if (title !== undefined) {
    updates.push(`title = $${i++}`);
    values.push(String(title).trim());
  }
  if (description !== undefined) {
    updates.push(`description = $${i++}`);
    values.push(description);
  }
  if (fields !== undefined) {
    updates.push(`fields = $${i++}`);
    values.push(JSON.stringify(fields));
  }
  if (published !== undefined) {
    updates.push(`published = $${i++}`);
    values.push(Boolean(published));
  }

  if (updates.length === 0) {
    throw ApiError.badRequest('No updatable fields provided');
  }

  const idParam = i;
  values.push(req.params.id);
  const ownerParam = i + 1;
  values.push(req.user.uid);

  // Scoped to owner: a non-owner gets 0 rows -> 404 (don't reveal existence).
  const { rows } = await query(
    `UPDATE forms SET ${updates.join(', ')}
       WHERE id = $${idParam} AND user_id = $${ownerParam}
       RETURNING ${FORM_COLS}`,
    values
  );
  if (rows.length === 0) throw ApiError.notFound('Form not found');
  res.json({ data: rows[0] });
};

/** DELETE /api/forms/:id — delete a form the user owns (submissions cascade). */
export const deleteForm = async (req, res) => {
  const { rowCount } = await query(
    'DELETE FROM forms WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.uid]
  );
  if (rowCount === 0) throw ApiError.notFound('Form not found');
  res.status(204).send();
};

/** GET /api/forms/:id/submissions — list submissions (owner only). */
export const listSubmissions = async (req, res) => {
  const owned = await query(
    'SELECT 1 FROM forms WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.uid]
  );
  if (owned.rowCount === 0) throw ApiError.notFound('Form not found');

  const { rows } = await query(
    `SELECT id, form_id AS "formId", data, created_at AS "createdAt"
       FROM submissions
       WHERE form_id = $1
       ORDER BY created_at DESC`,
    [req.params.id]
  );
  res.json({ data: rows });
};

/**
 * POST /api/forms/:id/submissions — submit a response to a form.
 * Public: respondents don't need an account.
 */
export const createSubmission = async (req, res) => {
  const exists = await query('SELECT 1 FROM forms WHERE id = $1', [
    req.params.id,
  ]);
  if (exists.rowCount === 0) throw ApiError.notFound('Form not found');

  const { data } = req.body ?? {};
  if (data === undefined || typeof data !== 'object' || Array.isArray(data)) {
    throw ApiError.badRequest('"data" is required and must be an object');
  }

  const { rows } = await query(
    `INSERT INTO submissions (form_id, data)
     VALUES ($1, $2)
     RETURNING id, form_id AS "formId", data, created_at AS "createdAt"`,
    [req.params.id, JSON.stringify(data)]
  );
  res.status(201).json({ data: rows[0] });
};
