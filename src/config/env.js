import 'dotenv/config';

/**
 * Centralized, validated environment configuration.
 * Importing this everywhere (instead of reading process.env directly) keeps
 * env access in one place and fails fast on missing required values.
 */
const required = (key) => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

export const env = {
  port: Number(process.env.PORT) || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: required('DATABASE_URL'),
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  // Optional at boot so the server still runs without AI configured; the AI
  // endpoints surface a clear 503 when it's missing (see config/openrouter.js).
  openrouterApiKey: process.env.OPENROUTER_API_KEY || '',
  // OpenRouter model id (provider/model). Must support structured outputs.
  // Override per-environment, e.g. anthropic/claude-sonnet-4 or openai/gpt-4o.
  aiModel: process.env.AI_MODEL || 'openai/gpt-4o-mini',
  // Optional: your app URL, sent to OpenRouter as HTTP-Referer for attribution.
  appUrl: process.env.APP_URL || '',
  // Firebase Admin service-account credentials — used to verify ID tokens.
  // Optional at boot; protected routes return 503 until these are set.
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
    // The private key in .env keeps literal "\n" sequences; restore real newlines.
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  },
};

export const isProd = env.nodeEnv === 'production';
