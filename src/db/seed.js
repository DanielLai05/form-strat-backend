import { pool, query } from '../config/db.js';

/** Insert sample data. Safe to re-run: clears existing rows first. */
async function seed() {
  await query('TRUNCATE submissions, forms RESTART IDENTITY CASCADE');

  const fields = [
    { type: 'text', label: 'Name', required: true },
    { type: 'email', label: 'Email', required: true },
    { type: 'textarea', label: 'Comments', required: false },
  ];

  const { rows } = await query(
    `INSERT INTO forms (title, description, fields, published)
     VALUES ($1, $2, $3, $4)
     RETURNING id, title`,
    ['Customer Feedback', 'Tell us what you think.', JSON.stringify(fields), true]
  );
  const form = rows[0];

  await query(
    `INSERT INTO submissions (form_id, data) VALUES ($1, $2)`,
    [
      form.id,
      JSON.stringify({ Name: 'Ada Lovelace', Email: 'ada@example.com', Comments: 'Love it!' }),
    ]
  );

  console.log(`🌱 Seeded form "${form.title}" (${form.id})`);
}

seed()
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
