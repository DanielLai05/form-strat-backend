/**
 * Per-field statistics for a form, computed with SQL aggregation over the typed
 * submission_answers table — so Postgres does the GROUP BY / AVG / COUNT work
 * instead of Node loading every submission into memory and looping.
 *
 * The output shape is unchanged from the old in-memory version, so the frontend
 * and the AI narrative prompt don't need to change.
 */

import { query } from '../config/db.js';
import { isChoiceField } from './normalize.service.js';

const NUMERIC_TYPES = new Set(['number', 'rating']);

/** Stats for a single field, dispatched by type. */
const fieldStat = async (field, total) => {
  const stat = {
    label: field.label,
    name: field.field_key,
    type: field.type,
    answered: 0,
    answerRate: 0,
  };

  // How many distinct submissions answered this field (a checkbox can have
  // several rows per submission, so count DISTINCT submission_id).
  const answeredRes = await query(
    `SELECT COUNT(DISTINCT submission_id)::int AS answered
       FROM submission_answers WHERE field_id = $1`,
    [field.id]
  );
  stat.answered = answeredRes.rows[0].answered;
  stat.answerRate = total ? Number((stat.answered / total).toFixed(2)) : 0;

  if (isChoiceField(field.type)) {
    const { rows } = await query(
      `SELECT value_text AS value, COUNT(*)::int AS count
         FROM submission_answers
        WHERE field_id = $1 AND value_text IS NOT NULL
        GROUP BY value_text
        ORDER BY count DESC, value_text`,
      [field.id]
    );
    stat.distribution = Object.fromEntries(rows.map((r) => [r.value, r.count]));
  } else if (NUMERIC_TYPES.has(field.type)) {
    const { rows } = await query(
      `SELECT COUNT(value_number)::int AS count,
              MIN(value_number) AS min,
              MAX(value_number) AS max,
              AVG(value_number) AS mean
         FROM submission_answers
        WHERE field_id = $1 AND value_number IS NOT NULL`,
      [field.id]
    );
    const r = rows[0];
    stat.numeric = r.count
      ? {
          count: r.count,
          min: Number(r.min),
          max: Number(r.max),
          mean: Number(Number(r.mean).toFixed(2)),
        }
      : null;
  } else {
    // Free-text: a few sample answers are more useful than a distribution.
    const { rows } = await query(
      `SELECT value_text
         FROM submission_answers
        WHERE field_id = $1 AND value_text IS NOT NULL
        LIMIT 5`,
      [field.id]
    );
    stat.samples = rows.map((r) => r.value_text);
  }

  return stat;
};

/**
 * Build per-field statistics plus a responses-over-time series for one form.
 *
 * @param {{ id: string }} form
 * @returns {Promise<{ totalSubmissions, perField, responsesOverTime }>}
 */
export const computeStats = async (form) => {
  const totalRes = await query(
    'SELECT COUNT(*)::int AS total FROM submissions WHERE form_id = $1',
    [form.id]
  );
  const total = totalRes.rows[0].total;

  // Only active fields, in builder order.
  const fieldsRes = await query(
    `SELECT id, field_key, label, type
       FROM form_fields
      WHERE form_id = $1 AND active = true
      ORDER BY position`,
    [form.id]
  );

  const perField = [];
  for (const field of fieldsRes.rows) {
    perField.push(await fieldStat(field, total));
  }

  // Responses grouped by calendar day (UTC).
  const timeRes = await query(
    `SELECT to_char(date_trunc('day', created_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS date,
            COUNT(*)::int AS count
       FROM submissions
      WHERE form_id = $1
      GROUP BY 1
      ORDER BY 1`,
    [form.id]
  );

  return {
    totalSubmissions: total,
    perField,
    responsesOverTime: timeRes.rows,
  };
};