import { z } from 'zod';

/**
 * Zod schemas shared by the AI features. Passed to the OpenAI SDK via
 * `zodResponseFormat` so the model's responses are constrained to valid JSON
 * that matches these shapes — no fragile prompt-parsing required.
 */

// The field types the form builder supports. Keep in sync with the frontend
// renderer.
export const FIELD_TYPES = [
  'text',
  'textarea',
  'email',
  'number',
  'tel',
  'date',
  'select',
  'radio',
  'checkbox',
];

const formFieldSchema = z.object({
  type: z.enum(FIELD_TYPES),
  label: z.string().describe('Human-readable label shown above the input'),
  // A machine key derived from the label, e.g. "Full Name" -> "full_name".
  name: z.string().describe('snake_case identifier for the field'),
  required: z.boolean(),
  placeholder: z
    .string()
    .nullable()
    .describe('Optional placeholder/help text; null if not applicable'),
  // Only meaningful for select/radio/checkbox; null/empty otherwise.
  options: z
    .array(z.string())
    .nullable()
    .describe('Choices for select/radio/checkbox fields; null for others'),
});

/** Output schema for AI form generation. */
export const generatedFormSchema = z.object({
  title: z.string(),
  description: z.string().nullable(),
  fields: z.array(formFieldSchema),
});

/** Output schema for AI field suggestions. */
export const suggestedFieldsSchema = z.object({
  fields: z.array(formFieldSchema),
  rationale: z
    .string()
    .describe('One short paragraph explaining why these fields were suggested'),
});

/** Output schema for AI analytics narrative. */
export const analyticsInsightsSchema = z.object({
  summary: z.string().describe('2-4 sentence overview of the responses'),
  keyFindings: z
    .array(z.string())
    .describe('Specific, data-grounded observations'),
  recommendations: z
    .array(z.string())
    .describe('Actionable suggestions based on the data'),
});
