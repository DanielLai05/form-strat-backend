import Anthropic from '@anthropic-ai/sdk';
import { env } from './env.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Shared Anthropic client. Created lazily so the server can boot without an API
 * key — only AI endpoints require it.
 */
let client = null;

export const getAnthropic = () => {
  if (!env.anthropicApiKey) {
    throw new ApiError(
      503,
      'AI features are not configured. Set ANTHROPIC_API_KEY in your environment.'
    );
  }
  if (!client) {
    client = new Anthropic({ apiKey: env.anthropicApiKey });
  }
  return client;
};

export const isAiConfigured = () => Boolean(env.anthropicApiKey);
