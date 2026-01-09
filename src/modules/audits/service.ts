import { decodeCursor, encodeCursor } from '../../utils/cursor.js';
import * as auditRepo from './repository.js';

export type AuditsListQuery = {
  limit: number;
  cursor?: string;
  from?: string;
  to?: string;
  entity?: string;
  entityId?: string;
  actorId?: string;
  action?: 'create' | 'update' | 'delete' | 'restore' | 'login';
  fieldsChanged?: string;
  requestId?: string;
};

export async function listAudits(query: AuditsListQuery) {
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

  const items = await auditRepo.listAudits({ where, limitPlusOne: query.limit + 1 });

  const hasMore = items.length > query.limit;
  const pageItems = hasMore ? items.slice(0, query.limit) : items;
  const nextCursor = hasMore
    ? encodeCursor({
        ts: pageItems[pageItems.length - 1]!.timestamp.toISOString(),
        id: pageItems[pageItems.length - 1]!.id
      })
    : undefined;

  return { items: pageItems, nextCursor };
}

export async function getAuditById(id: string) {
  return await auditRepo.findAuditById(id);
}

