import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { query } from '../config/db.js';
import { getAnthropic, isAiConfigured } from '../config/anthropic.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { computeStats } from '../services/analytics.service.js';
import { analyticsInsightsSchema } from '../ai/schemas.js';

/** Ask Claude to interpret the pre-computed stats. Returns null on any failure. */
const generateInsights = async (form, stats) => {
  if (!isAiConfigured()) return null;

  const client = getAnthropic();
  const payload = JSON.stringify(
    { form: { title: form.title, description: form.description }, stats },
    null,
    2
  );

  const message = await client.beta.messages.parse({
    model: env.aiModel,
    max_tokens: 2048,
    thinking: { type: 'adaptive' },
    system:
      'You are a data analyst. You are given aggregated statistics for a form ' +
      "and its responses. Interpret the numbers — do not invent data that isn't " +
      'present. Be specific and reference the actual figures.',
    messages: [
      {
        role: 'user',
        content: `Analyze these form-response statistics:\n\n${payload}`,
      },
    ],
    output_format: betaZodOutputFormat(analyticsInsightsSchema, 'insights'),
  });

  return message.parsed_output ?? null;
};

/**
 * GET /api/forms/:id/analytics
 * Returns raw per-field statistics plus an AI-written narrative (when the AI is
 * configured). Query param ?ai=false skips the narrative.
 */
export const getAnalytics = async (req, res) => {
  const formResult = await query(
    `SELECT id, title, description, fields FROM forms WHERE id = $1`,
    [req.params.id]
  );
  if (formResult.rowCount === 0) throw ApiError.notFound('Form not found');
  const form = formResult.rows[0];

  const subResult = await query(
    `SELECT data, created_at AS "createdAt"
       FROM submissions
       WHERE form_id = $1
       ORDER BY created_at ASC`,
    [req.params.id]
  );

  const stats = computeStats(form, subResult.rows);

  // AI narrative is opt-out via ?ai=false, and skipped automatically when there
  // are no submissions to analyze.
  const wantsAi = req.query.ai !== 'false';
  let insights = null;
  if (wantsAi && stats.totalSubmissions > 0) {
    try {
      insights = await generateInsights(form, stats);
    } catch (err) {
      // Analytics should still return stats even if the AI call fails.
      console.error('AI insights failed:', err.message);
    }
  }

  res.json({
    data: {
      formId: form.id,
      title: form.title,
      stats,
      insights,
      aiConfigured: isAiConfigured(),
    },
  });
};
