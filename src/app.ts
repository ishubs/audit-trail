import Fastify, { type FastifyInstance } from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';

import { type Env } from './config/env.js';
import { buildLogger } from './plugins/logger.js';
import { requestTracingPlugin } from './plugins/requestTracing.js';
import { registerAuth } from './plugins/auth.js';
import { registerErrorHandling } from './plugins/errorHandler.js';
import { registerBookRoutes } from './modules/books/routes.js';
import { registerAuditRoutes } from './modules/audits/routes.js';

export async function buildApp(env: Env): Promise<FastifyInstance> {
  const app = Fastify({
    logger: buildLogger(env),
    disableRequestLogging: true,
    trustProxy: true
  });

  await app.register(helmet);
  await app.register(cors, { origin: true });
  await app.register(sensible);
  await app.register(requestTracingPlugin);

  registerErrorHandling(app, env);
  await registerAuth(app);

  app.get('/health', async () => ({ ok: true }));

  await registerBookRoutes(app);
  await registerAuditRoutes(app);

  // Placeholder to ensure env
  app.decorate('env', env);

  return app;
}

