import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { pool } from '../config/db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Apply schema.sql against the configured database. */
async function migrate() {
  const sql = await readFile(join(__dirname, 'schema.sql'), 'utf-8');
  await pool.query(sql);
  console.log('✅ Schema applied');
}

migrate()
  .catch((err) => {
    console.error('❌ Migration failed:', err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
