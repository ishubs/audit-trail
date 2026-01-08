import { type FastifyInstance } from 'fastify';

import { prisma } from '../db/prisma.js';
import { enterWithRequestContext, setUserId } from '../context/requestContext.js';

export type AuthUser = {
  id: string;
  name: string;
  role: 'admin' | 'reviewer';
};

export async function registerAuth(app: FastifyInstance) {
  app.addHook('preHandler', async (req) => {
    // Allow health check unauthenticated
    if (req.routeOptions?.url === '/health') return;

    if (!req.requestContext) {
      const headerRid = req.headers['x-request-id']?.toString();
      req.requestContext = {
        requestId: headerRid ?? req.id,
        route: req.routeOptions?.url,
        method: req.method
      };
    }
    enterWithRequestContext(req.requestContext);

    const apiKey = req.headers['x-api-key']?.toString();
    if (!apiKey) {
      throw app.httpErrors.unauthorized('Missing X-API-Key');
    }

    const user = await prisma.user.findUnique({
      where: { apiKey },
      select: { id: true, name: true, role: true }
    });
    if (!user) {
      throw app.httpErrors.unauthorized('Invalid API key');
    }

    req.user = user;
    req.requestContext.userId = user.id;
    enterWithRequestContext(req.requestContext);
    setUserId(user.id);
  });
}

export function requireRole(role: AuthUser['role']) {
  return async (req: any) => {
    const user = req.user as AuthUser | null | undefined;
    if (!user) throw req.server.httpErrors.unauthorized();
    if (user.role !== role) throw req.server.httpErrors.forbidden();
  };
}
