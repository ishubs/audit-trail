import { type FastifyInstance } from 'fastify';

import { requireRole } from '../../plugins/auth.js';
import { getAuditController, listAuditsController } from './controller.js';

export async function registerAuditRoutes(app: FastifyInstance) {
  app.get('/api/audits', { preHandler: requireRole('admin') }, listAuditsController);
  app.get('/api/audits/:id', { preHandler: requireRole('admin') }, getAuditController);
}

