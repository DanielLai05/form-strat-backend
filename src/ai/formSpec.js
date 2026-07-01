export const FIELD_TYPES = [
  { type: 'text', desc: 'single-line short text' },
  { type: 'textarea', desc: 'multi-line paragraph text' },
  { type: 'email', desc: 'email address' },
  { type: 'tel', desc: 'phone number' },
  { type: 'number', desc: 'numeric input' },
  { type: 'date', desc: 'date picker' },
  { type: 'select', desc: 'dropdown, single choice (needs options)' },
  { type: 'radio', desc: 'multiple choice, single select (needs options)' },
  { type: 'checkbox', desc: 'checkboxes, multiple select (needs options)' },
  { type: 'rating', desc: 'star rating (set max, default 5)' },
  { type: 'file', desc: 'file upload' },
]

const ALLOWED = new Set(FIELD_TYPES.map((f) => f.type))
const CHOICE = new Set(['select', 'radio', 'checkbox'])

const catalog = FIELD_TYPES.map((f) => `- ${f.type}: ${f.desc}`).join('\n')

export const GENERATE_SYSTEM_PROMPT = `You are a form-building assistant for "Form Strat".
Given a short description, design a useful form and return it as a single JSON object.

Return JSON in exactly this shape:
{
  "title": "Form title",
  "description": "One-sentence description of the form",
  "fields": [
    { "type": "text", "label": "Question", "help": "", "required": true, "options": ["A","B"], "max": 5 }
  ]
}

Allowed "type" values (use ONLY these):
${catalog}

Rules:
- Include "options" (a non-empty array of strings) ONLY for select, radio, and checkbox. Omit it for every other type.
- Include "max" (an integer such as 5) ONLY for rating. Omit it otherwise.
- For rating fields, do NOT put scale explanations (e.g. "1 = Not interested, 5 = Very interested") in "help" — the stars are self-explanatory; leave "help" as "".
- "help" is an optional short hint shown under the question; use "" when not needed.
- Set "required": true only for genuinely essential fields.
- Include the fields a real form for this purpose needs — nothing extraneous.
- Respond with ONLY the JSON object. No markdown, no code fences, no commentary.`

export const SUGGEST_SYSTEM_PROMPT = `You are a form-building assistant for "Form Strat".
You will be given an existing form draft as JSON. Suggest additional or improved fields
that would make it more complete. Do not repeat fields that already exist.

Return JSON in exactly this shape:
{ "fields": [ { "type": "text", "label": "Question", "help": "", "required": false } ] }

Allowed "type" values (use ONLY these):
${catalog}

Rules:
- Include "options" (a non-empty array of strings) ONLY for select, radio, and checkbox.
- Include "max" (an integer) ONLY for rating.
- Respond with ONLY the JSON object. No markdown, no code fences, no commentary.`

export function extractJson(text) {
  if (!text) throw new Error('empty response')
  let s = String(text).trim()
  s = s.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim()
  const start = s.indexOf('{')
  const end = s.lastIndexOf('}')
  if (start === -1 || end === -1 || end < start) throw new Error('no JSON object found')
  return JSON.parse(s.slice(start, end + 1))
}

const clampStars = (n) => {
  const v = Math.round(Number(n))
  if (!Number.isFinite(v)) return 5
  return Math.min(Math.max(v, 2), 10)
}

function normalizeField(f) {
  if (!f || typeof f !== 'object') return null
  const type = ALLOWED.has(f.type) ? f.type : 'text'
  const field = {
    type,
    label: String(f.label || 'Untitled question').trim() || 'Untitled question',
    help: typeof f.help === 'string' ? f.help : '',
    required: Boolean(f.required),
  }
  if (CHOICE.has(type)) {
    let options = Array.isArray(f.options)
      ? f.options.map((o) => String(o)).filter((o) => o.trim())
      : []
    if (options.length === 0) options = ['Option 1', 'Option 2', 'Option 3']
    field.options = options
  }
  if (type === 'rating') field.max = clampStars(f.max)
  return field
}

export function normalizeFields(arr) {
  return (Array.isArray(arr) ? arr : []).map(normalizeField).filter(Boolean)
}

export function normalizeGeneratedForm(raw) {
  const obj = raw && typeof raw === 'object' ? raw : {}
  return {
    title: String(obj.title || 'Untitled form').trim() || 'Untitled form',
    description: typeof obj.description === 'string' ? obj.description : '',
    fields: normalizeFields(obj.fields),
  }
}
