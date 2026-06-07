/**
 * Pure functions that turn a form + its submissions into raw statistics.
 * No database or AI here — just aggregation, so it's easy to test and reuse.
 */

/** Key a submission's answers by — prefer the field's `name`, fall back to `label`. */
const valueFor = (data, field) => {
  if (data == null) return undefined;
  if (field.name != null && data[field.name] !== undefined) return data[field.name];
  return data[field.label];
};

const isChoiceField = (type) =>
  type === 'select' || type === 'radio' || type === 'checkbox';

/** Tally how many times each distinct value appears. */
const distribution = (values) => {
  const counts = {};
  for (const v of values) {
    // checkbox answers may be arrays of selected options
    const items = Array.isArray(v) ? v : [v];
    for (const item of items) {
      const key = String(item);
      counts[key] = (counts[key] ?? 0) + 1;
    }
  }
  return counts;
};

/** Min / max / mean for numeric fields. */
const numericSummary = (values) => {
  const nums = values.map(Number).filter((n) => Number.isFinite(n));
  if (nums.length === 0) return null;
  const sum = nums.reduce((a, b) => a + b, 0);
  return {
    count: nums.length,
    min: Math.min(...nums),
    max: Math.max(...nums),
    mean: Number((sum / nums.length).toFixed(2)),
  };
};

/**
 * Build per-field statistics plus a responses-over-time series.
 *
 * @param {{ fields?: Array }} form
 * @param {Array<{ data: object, createdAt: string|Date }>} submissions
 */
export const computeStats = (form, submissions) => {
  const fields = Array.isArray(form?.fields) ? form.fields : [];
  const total = submissions.length;

  const perField = fields.map((field) => {
    const answers = submissions
      .map((s) => valueFor(s.data, field))
      .filter((v) => v !== undefined && v !== null && v !== '');

    const stat = {
      label: field.label,
      name: field.name ?? null,
      type: field.type,
      answered: answers.length,
      answerRate: total ? Number((answers.length / total).toFixed(2)) : 0,
    };

    if (isChoiceField(field.type)) {
      stat.distribution = distribution(answers);
    } else if (field.type === 'number') {
      stat.numeric = numericSummary(answers);
    } else {
      // For free-text, a few sample answers are more useful than a distribution.
      stat.samples = answers.slice(0, 5).map((v) => String(v));
    }
    return stat;
  });

  // Responses grouped by calendar day (UTC).
  const byDay = {};
  for (const s of submissions) {
    const day = new Date(s.createdAt).toISOString().slice(0, 10);
    byDay[day] = (byDay[day] ?? 0) + 1;
  }
  const responsesOverTime = Object.entries(byDay)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return { totalSubmissions: total, perField, responsesOverTime };
};
