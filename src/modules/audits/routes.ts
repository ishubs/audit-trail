import { type FastifyInstance } from 'fastify';

import { prisma } from '../../db/prisma.js';
import { enterWithRequestContext } from '../../context/requestContext.js';
import { requireRole } from '../../plugins/auth.js';
import { decodeCursor, encodeCursor } from '../../utils/cursor.js';
import { auditsListQuerySchema } from './schemas.js';

export async function registerAuditRoutes(app: FastifyInstance) {
  app.get(
    '/api/audits',
    { preHandler: requireRole('admin') },
    async (req, reply) => {
      if (req.requestContext) enterWithRequestContext(req.requestContext);
      const query = auditsListQuerySchema.parse(req.query);

      const cursor = query.cursor ? decodeCursor(query.cursor) : null;

      const where: any = {};
      if (query.entity) where.entity = query.entity;
      if (query.entityId) where.entityId = query.entityId;
      if (query.actorId) where.actorId = query.actorId;
      if (query.action) where.action = query.action;
      if (query.requestId) where.requestId = query.requestId;

      if (query.from || query.to) {
        where.timestamp = {};
        if (query.from) where.timestamp.gte = new Date(query.from);
        if (query.to) where.timestamp.lte = new Date(query.to);
      }

      if (query.fieldsChanged) {
        const fields = query.fieldsChanged
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        if (fields.length) {
          where.OR = fields.map((f) => ({ changedFields: { contains: `,${f},` } }));
        }
      }

      if (cursor) {
        const cursorFilter = {
          OR: [
            { timestamp: { lt: new Date(cursor.ts) } },
            { timestamp: new Date(cursor.ts), id: { lt: cursor.id } }
          ]
        };
        if (where.AND) where.AND.push(cursorFilter);
        else where.AND = [cursorFilter];
      }

      const items = await prisma.auditLog.findMany({
        where,
        orderBy: [{ timestamp: 'desc' }, { id: 'desc' }],
        take: query.limit + 1
      });

      const hasMore = items.length > query.limit;
      const pageItems = hasMore ? items.slice(0, query.limit) : items;
      const nextCursor = hasMore
        ? encodeCursor({
            ts: pageItems[pageItems.length - 1]!.timestamp.toISOString(),
            id: pageItems[pageItems.length - 1]!.id
          })
        : undefined;

      return reply.send({ items: pageItems, nextCursor });
    }
  );

  app.get('/api/audits/:id', { preHandler: requireRole('admin') }, async (req, reply) => {
    if (req.requestContext) enterWithRequestContext(req.requestContext);
    const id = (req.params as any).id as string;
    const audit = await prisma.auditLog.findUnique({ where: { id } });
    if (!audit) return reply.notFound('Audit not found');
    return reply.send(audit);
  });
}

