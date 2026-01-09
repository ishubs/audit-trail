import { auditConfig, type AuditableEntity } from '../config/auditConfig.js';
import { getRequestContext } from '../context/requestContext.js';
import { buildAuditDiff } from '../utils/diff.js';
import { AuditLogModel } from './models/AuditLog.js';

function isAuditedEntity(entity: string): entity is AuditableEntity {
  return Object.prototype.hasOwnProperty.call(auditConfig, entity);
}

function inferSoftDeleteAction(before: any, after: any): 'delete' | 'restore' | null {
  if (!before || !after) return null;
  if (!('deletedAt' in before) || !('deletedAt' in after)) return null;
  const b = before.deletedAt ? new Date(before.deletedAt).toISOString() : null;
  const a = after.deletedAt ? new Date(after.deletedAt).toISOString() : null;
  if (b === null && a !== null) return 'delete';
  if (b !== null && a === null) return 'restore';
  return null;
}

export async function writeAudit(params: {
  entity: string;
  entityId: string;
  action: 'create' | 'update' | 'delete' | 'restore' | 'auth_check';
  before: unknown;
  after: unknown;
}) {
  const ctx = getRequestContext();
  const actorId = ctx?.userId;
  const requestId = ctx?.requestId;
  if (!actorId || !requestId) return;

  if (!isAuditedEntity(params.entity)) return;
  const cfg = auditConfig[params.entity];
  if (!cfg.track) return;

  const inferred = params.action === 'update' ? inferSoftDeleteAction(params.before, params.after) : null;
  const auditAction = inferred ?? params.action;

  const diff = buildAuditDiff({ before: params.before, after: params.after, cfg });
  const changedFieldsPacked = diff.changedFields.length ? `,${diff.changedFields.join(',')},` : '';

  await AuditLogModel.create({
    entity: params.entity,
    entityId: params.entityId,
    action: auditAction,
    actorId,
    requestId,
    route: ctx?.route,
    method: ctx?.method,
    diff: { before: diff.before, after: diff.after, changedFields: diff.changedFields },
    changedFieldsPacked
  });
}

