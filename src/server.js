import app from './app.js';
import { env } from './config/env.js';
import { closePool } from './config/db.js';

const server = app.listen(env.port, () => {
  console.log(`🚀 Form Strat API listening on http://localhost:${env.port}`);
  console.log(`   Environment: ${env.nodeEnv}`);
});

// Graceful shutdown: close the HTTP server and DB connection on exit signals.
const shutdown = async (signal) => {
  console.log(`\n${signal} received, shutting down...`);
  server.close(async () => {
    await closePool();
    process.exit(0);
  });
};

['SIGINT', 'SIGTERM'].forEach((signal) =>
  process.on(signal, () => shutdown(signal))
);
