import { randomUUID } from 'node:crypto';

import { type FastifyInstance, type FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

import {
  enterWithRequestContext,
  getRequestContext,
  setRequestContextPatch
} from '../context/requestContext.js';

// Wrapped with fastify-plugin so hooks apply to routes registered outside this plugin's scope.
export const requestTracingPlugin: FastifyPluginAsync = fp(async (app: FastifyInstance) => {
  app.decorateRequest('requestStart', 0);


  app.addHook('onRoute', (routeOptions) => {
    const original = routeOptions.handler;
    routeOptions.handler = function (this: any, req: any, reply: any) {
      if (req.requestContext) enterWithRequestContext(req.requestContext);
      return original.call(this, req, reply);
    };
  });

  app.addHook('onRequest', async (req) => {
    const requestId = (req.headers['x-request-id'] as string | undefined) ?? randomUUID();
    req.requestStart = Date.now();
    req.requestContext = { requestId };

    enterWithRequestContext({ requestId });
  });

  app.addHook('preHandler', async (req) => {
    if (req.requestContext) enterWithRequestContext(req.requestContext);
    if (req.requestContext) {
      req.requestContext.method = req.method;
      req.requestContext.route = req.routeOptions?.url;
    }
    setRequestContextPatch({
      method: req.method,
      route: req.routeOptions?.url
    });
  });

  app.addHook('onResponse', async (req, reply) => {
    if (req.requestContext) enterWithRequestContext(req.requestContext);
    const durationMs = Date.now() - (req.requestStart || Date.now());
    const ctx = getRequestContext();
    app.log.info(
      {
        requestId: ctx?.requestId,
        userId: ctx?.userId,
        route: req.routeOptions?.url,
        method: req.method,
        status: reply.statusCode,
        durationMs
      },
      'request_summary'
    );
  });
});

