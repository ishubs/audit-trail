import { decodeCursor, encodeCursor } from '../../utils/cursor.js';
import * as auditRepo from './repository.js';
import mongoose from 'mongoose';

export type AuditsListQuery = {
  limit: number;
  cursor?: string;
  from?: string;
  to?: string;
  entity?: string;
  entityId?: string;
  actorId?: string;
  action?: 'create' | 'update' | 'delete' | 'restore' | 'auth_check';
  fieldsChanged?: string;
  requestId?: string;
};

export async function listAudits(query: AuditsListQuery) {
  const cursor = query.cursor ? decodeCursor(query.cursor) : null;

  const filter: any = {};
  if (query.entity) filter.entity = query.entity;
  if (query.entityId) filter.entityId = query.entityId;
  if (query.actorId) filter.actorId = query.actorId;
  if (query.action) filter.action = query.action;
  if (query.requestId) filter.requestId = query.requestId;

  if (query.from || query.to) {
    filter.timestamp = {};
    if (query.from) filter.timestamp.$gte = new Date(query.from);
    if (query.to) filter.timestamp.$lte = new Date(query.to);
  }

  if (query.fieldsChanged) {
    const fields = query.fieldsChanged
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (fields.length) {
      const ors = fields.map((f) => ({
        changedFieldsPacked: { $regex: new RegExp(`,${escapeRegex(f)},`) }
      }));
      filter.$or = filter.$or ? [...filter.$or, ...ors] : ors;
    }
  }

  if (cursor && mongoose.isValidObjectId(cursor.id)) {
    const cursorTs = new Date(cursor.ts);
    const cursorId = new mongoose.Types.ObjectId(cursor.id);
    const cursorFilter = {
      $or: [
        { timestamp: { $lt: cursorTs } },
        { timestamp: { $eq: cursorTs }, _id: { $lt: cursorId } }
      ]
    };
    filter.$and = filter.$and ? [...filter.$and, cursorFilter] : [cursorFilter];
  }

  const items = await auditRepo.listAudits({ filter, limitPlusOne: query.limit + 1 });

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

function escapeRegex(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
