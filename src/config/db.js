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

/** Close the pool (used on graceful shutdown). */
export const closePool = () => pool.end();
