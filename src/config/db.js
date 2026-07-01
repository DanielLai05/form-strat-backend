import pg from 'pg';
import { env } from './env.js';

const { Pool } = pg;

// Hosted Postgres (Neon, Supabase, Heroku, etc.) requires SSL. If the
// connection string asks for it, enable SSL on the driver.
const needsSsl = /\bsslmode=require\b/.test(env.databaseUrl);

/**
 * A single shared connection pool for the whole app. The pool manages and
 * reuses client connections, so we never open one per request.
 */
export const pool = new Pool({
  connectionString: env.databaseUrl,
  ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  // On Vercel each serverless invocation is a fresh isolate; cap connections so
  // many concurrent instances don't exhaust the database. Locally, use the
  // driver's default pool size.
  ...(process.env.VERCEL ? { max: 1 } : {}),
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
});

/**
 * Run a parameterized query against the pool.
 * Always pass values via `params` (never string-concatenate) to avoid SQL
 * injection.
 *
 *   const { rows } = await query('SELECT * FROM forms WHERE id = $1', [id]);
 */
export const query = (text, params) => pool.query(text, params);

/**
 * Run `fn` inside a single transaction, passing it a dedicated client. Commits
 * if `fn` resolves, rolls back if it throws, and always releases the client.
 * Use this when several writes must succeed or fail together (e.g. inserting a
 * submission and its typed answer rows).
 *
 *   await withTransaction(async (client) => {
 *     await client.query('INSERT ...');
 *     await client.query('INSERT ...');
 *   });
 */
export const withTransaction = async (fn) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/** Close the pool (used on graceful shutdown). */
export const closePool = () => pool.end();
