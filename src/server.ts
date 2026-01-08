import 'dotenv/config';

import { buildApp } from './app.js';
import { loadEnv } from './config/env.js';

async function main() {
  const env = loadEnv(process.env);
  const app = await buildApp(env);

  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
    app.log.info({ port: env.PORT }, 'server listening');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  }
}

void main();

