/**
 * Keeps the normalized, typed tables (form_fields, submission_answers) in sync
 * with the raw JSON the rest of the app writes (forms.fields, submissions.data).
 *
 * Every function here takes a `client` so callers can run them inside a single
 * transaction with the raw-JSON write — the two representations never drift.
 */

const CHOICE_TYPES = new Set(['select', 'radio', 'checkbox']);
const NUMERIC_TYPES = new Set(['number', 'rating']);

/**
 * The stable key a field's answer is stored under in submissions.data.
 * Must match the frontend's fieldKey(): field.id ?? field.name ?? field.label.
 */
export const fieldKey = (field) =>
  field?.id ?? field?.name ?? field?.label ?? null;

/**
 * Upsert form_fields to mirror a form's `fields` array. Fields no longer present
 * are flagged inactive (not deleted) so historical answers keep a valid field_id.
 */
export const syncFormFields = async (client, formId, fields) => {
  const list = Array.isArray(fields) ? fields : [];
  const seenKeys = [];

  for (let position = 0; position < list.length; position++) {
    const field = list[position];
    const key = fieldKey(field);
    if (key == null) continue; // can't address an answer without a key
    seenKeys.push(String(key));

    await client.query(
      `INSERT INTO form_fields
         (form_id, field_key, label, type, required, options, position, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true)
       ON CONFLICT (form_id, field_key) DO UPDATE SET
         label    = EXCLUDED.label,
         type     = EXCLUDED.type,
         required = EXCLUDED.required,
         options  = EXCLUDED.options,
         position = EXCLUDED.position,
         active   = true`,
      [
        formId,
        String(key),
        field.label ?? '',
        field.type ?? 'text',
        Boolean(field.required),
        JSON.stringify(Array.isArray(field.options) ? field.options : []),
        position,
      ]
    );
  }

  // Deactivate any field that was removed from the form.
  await client.query(
    `UPDATE form_fields
        SET active = false
      WHERE form_id = $1
        AND active = true
        AND NOT (field_key = ANY($2::text[]))`,
    [formId, seenKeys]
  );
};

/** Map one raw answer value to the typed columns of a submission_answers row. */
const typedColumns = (fieldType, value) => {
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
  const row = {
    value_text: text,
    value_number: null,
    value_date: null,
    value_bool: null,
  };

  if (NUMERIC_TYPES.has(fieldType)) {
    const n = Number(value);
    if (Number.isFinite(n)) row.value_number = n;
  } else if (fieldType === 'date') {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) row.value_date = d.toISOString();
  } else if (typeof value === 'boolean') {
    row.value_bool = value;
  }

  return row;
};

/** True for "no answer" — these don't produce a submission_answers row. */
const isBlank = (v) =>
  v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);

/**
 * Expand a submission's raw `data` into typed submission_answers rows. A
 * multi-select (checkbox) answer becomes one row per chosen option, so option
 * tallies are a plain GROUP BY downstream.
 */
export const insertSubmissionAnswers = async (
  client,
  { submissionId, formId, fields, data }
) => {
  const list = Array.isArray(fields) ? fields : [];

  for (const field of list) {
    const key = fieldKey(field);
    if (key == null) continue;

    const raw = data?.[key];
    if (isBlank(raw)) continue;

    // Checkbox answers may arrive as an array; everything else is a single value.
    const items =
      field.type === 'checkbox' && Array.isArray(raw) ? raw : [raw];

    for (const item of items) {
      if (isBlank(item)) continue;
      const cols = typedColumns(field.type, item);

      await client.query(
        `INSERT INTO submission_answers
           (submission_id, field_id, value_text, value_number, value_date, value_bool)
         SELECT $1, ff.id, $4, $5, $6, $7
           FROM form_fields ff
          WHERE ff.form_id = $2 AND ff.field_key = $3`,
        [
          submissionId,
          formId,
          String(key),
          cols.value_text,
          cols.value_number,
          cols.value_date,
          cols.value_bool,
        ]
      );
    }
  }
};

export const isChoiceField = (type) => CHOICE_TYPES.has(type);