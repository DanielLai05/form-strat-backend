import OpenAI from 'openai';
import { env } from './env.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Shared AI client. OpenRouter is OpenAI-compatible, so we use the official
 * `openai` SDK pointed at OpenRouter's base URL. Created lazily so the server
 * can boot without a key — only AI endpoints require it.
 */
let client = null;

export const getAIClient = () => {
  if (!env.openrouterApiKey) {
    throw new ApiError(
      503,
      'AI features are not configured. Set OPENROUTER_API_KEY in your environment.'
    );
  }
  if (!client) {
    client = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: env.openrouterApiKey,
      // Optional headers OpenRouter uses for app attribution / rankings.
      defaultHeaders: {
        'X-Title': 'Form Strat',
        ...(env.appUrl ? { 'HTTP-Referer': env.appUrl } : {}),
      },
    });
  }
  return client;
};

export const isAiConfigured = () => Boolean(env.openrouterApiKey);
