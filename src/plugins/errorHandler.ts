import { type FastifyInstance } from 'fastify';
import { ZodError } from 'zod';

import { type Env } from '../config/env.js';
import { getRequestContext } from '../context/requestContext.js';

function errorCodeFromStatus(status: number) {
  if (status === 400) return 'BAD_REQUEST';
  if (status === 401) return 'UNAUTHORIZED';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'NOT_FOUND';
  return 'INTERNAL_SERVER_ERROR';
}

export function registerErrorHandling(app: FastifyInstance, env: Env) {
  app.setNotFoundHandler(async (req, reply) => {
    const ctx = getRequestContext();
    const requestId = ctx?.requestId ?? (req as any).requestId;
    return reply.status(404).send({
      error: { code: 'NOT_FOUND', message: 'Route not found', requestId }
    });
  });

  app.setErrorHandler(async (err, req, reply) => {
    const ctx = getRequestContext();
    const requestId = ctx?.requestId ?? (req as any).requestId;

    // Validation errors from zod
    if (err instanceof ZodError) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request',
          details: err.issues,
          requestId
        }
      });
    }

    const status = (err as any).statusCode && Number.isInteger((err as any).statusCode) ? (err as any).statusCode : 500;
    const code = (err as any).code && typeof (err as any).code === 'string' ? (err as any).code : errorCodeFromStatus(status);
    const message =
      status >= 500 ? 'Internal server error' : (err as any).message && typeof (err as any).message === 'string' ? (err as any).message : 'Request failed';

    app.log.error(
      {
        err,
        requestId,
        route: req.routeOptions?.url,
        method: req.method,
        status
      },
      'request error'
    );

    const details =
      env.NODE_ENV !== 'production' && status >= 500
        ? { stack: (err as any).stack }
        : undefined;

    return reply.status(status).send({
      error: {
        code,
        message,
        ...(details ? { details } : {}),
        requestId
      }
    });
  });
}

