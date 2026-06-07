import { zodResponseFormat } from 'openai/helpers/zod';
import { getAIClient } from '../config/openrouter.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import {
  FIELD_TYPES,
  generatedFormSchema,
  suggestedFieldsSchema,
} from '../ai/schemas.js';

const SYSTEM_PROMPT = `You are an expert form designer for "Form Strat", a form builder.
You produce clean, accessible form schemas. Rules:
- Use only these field types: ${FIELD_TYPES.join(', ')}.
- "name" must be snake_case derived from the label (e.g. "Full Name" -> "full_name").
- Provide "options" only for select, radio, and checkbox fields; use null otherwise.
- Keep forms focused: include the fields a real form for this purpose would need, nothing extraneous.
- Mark a field required only when it is genuinely essential.`;

/**
 * Run a structured-output chat completion and return the validated object.
 * Throws a 502 if the model refused or returned nothing parseable.
 */
const parseStructured = async ({ schema, schemaName, userContent }) => {
  const client = getAIClient();
  const completion = await client.chat.completions.parse({
    model: env.aiModel,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userContent },
    ],
    response_format: zodResponseFormat(schema, schemaName),
  });

  const message = completion.choices[0]?.message;
  if (message?.refusal) {
    throw new ApiError(502, `The model refused: ${message.refusal}`);
  }
  if (!message?.parsed) {
    throw new ApiError(502, 'The model did not return a valid response');
  }
  return message.parsed;
};

/**
 * POST /api/ai/generate-form
 * Body: { prompt: string }
 * Generates a complete form schema from a natural-language description.
 */
export const generateForm = async (req, res) => {
  const { prompt } = req.body ?? {};
  if (!prompt || typeof prompt !== 'string') {
    throw ApiError.badRequest('"prompt" is required and must be a string');
  }

  const form = await parseStructured({
    schema: generatedFormSchema,
    schemaName: 'form',
    userContent: `Create a form for the following request:\n\n${prompt}`,
  });
  res.json({ data: form });
};

/**
 * POST /api/ai/suggest-fields
 * Body: { title?, description?, fields: [...] }
 * Suggests additional/improved fields for an existing form draft.
 */
export const suggestFields = async (req, res) => {
  const { title, description, fields } = req.body ?? {};
  if (fields !== undefined && !Array.isArray(fields)) {
    throw ApiError.badRequest('"fields" must be an array when provided');
  }

  const existing = JSON.stringify(
    { title: title ?? null, description: description ?? null, fields: fields ?? [] },
    null,
    2
  );

  const result = await parseStructured({
    schema: suggestedFieldsSchema,
    schemaName: 'suggestions',
    userContent:
      `Here is the current form draft:\n\n${existing}\n\n` +
      'Suggest additional or improved fields that would make this form more ' +
      'complete and useful. Do not repeat fields that already exist. Return ' +
      'only the new suggested fields plus a short rationale.',
  });
  res.json({ data: result });
};
