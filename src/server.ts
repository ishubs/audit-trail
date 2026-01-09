import 'dotenv/config';

import { buildApp } from './app.js';
import { loadEnv } from './config/env.js';
import { connectMongo, disconnectMongo } from './db/mongoose.js';

async function main() {
  const env = loadEnv(process.env);
  await connectMongo({ databaseUrl: env.DATABASE_URL });
  const app = await buildApp(env);

  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
    app.log.info({ port: env.PORT }, 'server listening');

    const shutdown = async (signal: string) => {
      app.log.info({ signal }, 'shutdown_start');
      try {
        await app.close();
      } finally {
        await disconnectMongo();
      }
      app.log.info({ signal }, 'shutdown_complete');
    };

    process.once('SIGINT', () => void shutdown('SIGINT'));
    process.once('SIGTERM', () => void shutdown('SIGTERM'));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    await disconnectMongo();
    process.exit(1);
  }
}

void main();

