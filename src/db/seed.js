import { pool, withTransaction } from '../config/db.js';
import {
  syncFormFields,
  insertSubmissionAnswers,
} from '../services/normalize.service.js';

/**
 * Insert sample data through the same normalize path the API uses, so the
 * typed form_fields / submission_answers tables are populated too.
 * Safe to re-run: clears existing rows first.
 */

// Fields carry explicit ids, exactly like the builder produces — so each
// answer is keyed by field.id.
const fields = [
  { id: 'name', type: 'text', label: 'Name', required: true },
  { id: 'email', type: 'email', label: 'Email', required: true },
  { id: 'rating', type: 'rating', label: 'How would you rate us?', required: true, max: 5 },
  {
    id: 'recommend',
    type: 'radio',
    label: 'Would you recommend us?',
    required: true,
    options: ['Yes', 'No', 'Maybe'],
  },
  { id: 'comments', type: 'textarea', label: 'Comments', required: false },
];

const submissions = [
  { name: 'Ada Lovelace', email: 'ada@example.com', rating: 5, recommend: 'Yes', comments: 'Love it!' },
  { name: 'Alan Turing', email: 'alan@example.com', rating: 4, recommend: 'Yes', comments: 'Very useful.' },
  { name: 'Grace Hopper', email: 'grace@example.com', rating: 3, recommend: 'Maybe', comments: 'Could be faster.' },
  { name: 'Katherine Johnson', email: 'kat@example.com', rating: 5, recommend: 'Yes', comments: '' },
  { name: 'Linus Pauling', email: 'linus@example.com', rating: 2, recommend: 'No', comments: 'Hit a few bugs.' },
];

async function seed() {
  await withTransaction(async (client) => {
    await client.query('TRUNCATE submissions, forms RESTART IDENTITY CASCADE');

    const { rows } = await client.query(
      `INSERT INTO forms (owner_id, title, description, fields, published)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, title`,
      [
        'seed-user', // placeholder owner; real forms use the Firebase UID
        'Customer Feedback',
        'Tell us what you think.',
        JSON.stringify(fields),
        true,
      ]
    );
    const form = rows[0];
    await syncFormFields(client, form.id, fields);

    for (const data of submissions) {
      const sub = await client.query(
        'INSERT INTO submissions (form_id, data) VALUES ($1, $2) RETURNING id',
        [form.id, JSON.stringify(data)]
      );
      await insertSubmissionAnswers(client, {
        submissionId: sub.rows[0].id,
        formId: form.id,
        fields,
        data,
      });
    }

    console.log(
      `🌱 Seeded form "${form.title}" (${form.id}) with ${submissions.length} submissions`
    );
  });
}

seed()
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
