import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { getAnthropic } from '../config/anthropic.js';
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
 * POST /api/ai/generate-form
 * Body: { prompt: string }
 * Generates a complete form schema from a natural-language description.
 */
export const generateForm = async (req, res) => {
  const { prompt } = req.body ?? {};
  if (!prompt || typeof prompt !== 'string') {
    throw ApiError.badRequest('"prompt" is required and must be a string');
  }

  const client = getAnthropic();
  const message = await client.beta.messages.parse({
    model: env.aiModel,
    max_tokens: 4096,
    thinking: { type: 'adaptive' },
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Create a form for the following request:\n\n${prompt}`,
      },
    ],
    output_format: betaZodOutputFormat(generatedFormSchema, 'form'),
  });

  const form = message.parsed_output;
  if (!form) {
    throw new ApiError(502, 'The model did not return a valid form');
  }
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

  const client = getAnthropic();
  const message = await client.beta.messages.parse({
    model: env.aiModel,
    max_tokens: 4096,
    thinking: { type: 'adaptive' },
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content:
          `Here is the current form draft:\n\n${existing}\n\n` +
          'Suggest additional or improved fields that would make this form more ' +
          'complete and useful. Do not repeat fields that already exist. Return ' +
          'only the new suggested fields plus a short rationale.',
      },
    ],
    output_format: betaZodOutputFormat(suggestedFieldsSchema, 'suggestions'),
  });

  const result = message.parsed_output;
  if (!result) {
    throw new ApiError(502, 'The model did not return valid suggestions');
  }
  res.json({ data: result });
};
