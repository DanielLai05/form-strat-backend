import { getAIClient } from '../config/openrouter.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import {
  GENERATE_SYSTEM_PROMPT,
  SUGGEST_SYSTEM_PROMPT,
  extractJson,
  normalizeGeneratedForm,
  normalizeFields,
} from '../ai/formSpec.js';

const complete = async (systemPrompt, userPrompt) => {
  const client = getAIClient();
  const completion = await client.chat.completions.create({
    model: env.aiModel,
    max_tokens: 4000,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  });
  const content = completion.choices?.[0]?.message?.content || '';
  try {
    return extractJson(content);
  } catch {
    throw new ApiError(502, 'The AI did not return valid JSON. Please try again.');
  }
};

export const generateForm = async (req, res) => {
  const { prompt } = req.body ?? {};
  if (!prompt || typeof prompt !== 'string') {
    throw ApiError.badRequest('"prompt" is required and must be a string');
  }

  const raw = await complete(GENERATE_SYSTEM_PROMPT, `Create a form for: ${prompt}`);
  const form = normalizeGeneratedForm(raw);

  if (form.fields.length === 0) {
    throw new ApiError(502, 'The AI returned no usable fields. Try a more specific prompt.');
  }
  res.json({ data: form });
};

export const suggestFields = async (req, res) => {
  const { title, description, fields } = req.body ?? {};
  if (fields !== undefined && !Array.isArray(fields)) {
    throw ApiError.badRequest('"fields" must be an array when provided');
  }

  const draft = JSON.stringify(
    { title: title ?? null, description: description ?? null, fields: fields ?? [] },
    null,
    2
  );

  const raw = await complete(
    SUGGEST_SYSTEM_PROMPT,
    `Here is the current form draft:\n${draft}\n\nSuggest additional or improved fields.`
  );
  res.json({ data: { fields: normalizeFields(raw.fields ?? raw) } });
};
