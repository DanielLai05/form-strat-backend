-- Form Strat database schema.
-- Run with: npm run db:migrate
--
-- Design note: submissions are stored two ways on purpose.
--   * submissions.data (JSONB)      -> raw, full-fidelity copy of what the
--                                      respondent sent. Never lossy.
--   * submission_answers (relational)-> one TYPED row per answered field, so
--                                      analytics can aggregate in SQL
--                                      (GROUP BY / AVG / COUNT) instead of
--                                      loading every row into Node and looping.
-- form_fields is a normalized projection of forms.fields that gives each field
-- a stable id to hang those typed answers off of.
--
-- Every table uses a plain auto-incrementing BIGINT id (GENERATED ALWAYS AS
-- IDENTITY) — no UUIDs.

CREATE TABLE IF NOT EXISTS forms (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  -- Firebase UID of the owner. Every form belongs to the user who created it.
  owner_id    TEXT NOT NULL,
  title       TEXT NOT NULL,
  description TEXT,
  -- The builder's editable source of truth: an array of field definitions,
  -- e.g. [{ "id": "name", "type": "text", "label": "Name" }]. form_fields below
  -- is a normalized mirror of this, kept in sync on every write.
  fields      JSONB NOT NULL DEFAULT '[]'::jsonb,
  published   BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS forms_owner_id_idx ON forms(owner_id);

-- Normalized projection of forms.fields. One row per field, upserted whenever a
-- form's fields change. Fields removed from the form are flagged active=false
-- rather than deleted, so historical submission_answers keep a valid field_id.
CREATE TABLE IF NOT EXISTS form_fields (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  form_id    BIGINT NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  -- Stable key used to read this field's answer out of submissions.data.
  -- Must match the frontend's fieldKey(): field.id ?? field.name ?? field.label.
  field_key  TEXT NOT NULL,
  label      TEXT NOT NULL DEFAULT '',
  type       TEXT NOT NULL,
  required   BOOLEAN NOT NULL DEFAULT false,
  -- Choices for select/radio/checkbox; empty array otherwise.
  options    JSONB NOT NULL DEFAULT '[]'::jsonb,
  position   INT NOT NULL DEFAULT 0,
  active     BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (form_id, field_key)
);

CREATE INDEX IF NOT EXISTS form_fields_form_id_idx ON form_fields(form_id);

CREATE TABLE IF NOT EXISTS submissions (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  form_id    BIGINT NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  -- Raw answers keyed by field, e.g. { "name": "Ada" }. Kept verbatim.
  data       JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS submissions_form_id_idx ON submissions(form_id);

-- One typed row per answered field per submission. A multi-select (checkbox)
-- answer expands to one row per chosen option, so option tallies are a plain
-- GROUP BY. Values land in the column matching their type; value_text always
-- holds the display string for distributions and samples.
CREATE TABLE IF NOT EXISTS submission_answers (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  submission_id BIGINT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  field_id      BIGINT NOT NULL REFERENCES form_fields(id) ON DELETE CASCADE,
  value_text    TEXT,
  value_number  DOUBLE PRECISION,
  value_date    TIMESTAMPTZ,
  value_bool    BOOLEAN,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS submission_answers_field_id_idx ON submission_answers(field_id);
CREATE INDEX IF NOT EXISTS submission_answers_submission_id_idx ON submission_answers(submission_id);

-- Keep updated_at fresh on UPDATE.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS forms_set_updated_at ON forms;
CREATE TRIGGER forms_set_updated_at
  BEFORE UPDATE ON forms
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
