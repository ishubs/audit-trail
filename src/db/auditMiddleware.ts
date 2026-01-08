import { PrismaClient } from '@prisma/client';

import { auditConfig, type AuditableEntity } from '../config/auditConfig.js';
import { getRequestContext } from '../context/requestContext.js';
import { buildAuditDiff } from '../utils/diff.js';

type AuditedModelName = AuditableEntity;

function isAuditedModel(model: string | undefined): model is AuditedModelName {
  return !!model && Object.prototype.hasOwnProperty.call(auditConfig, model);
}

function getEntityId(result: unknown, fallbackId?: unknown): string | null {
  if (typeof result === 'object' && result !== null && 'id' in result) {
    const id = (result as any).id;
    return typeof id === 'string' ? id : id != null ? String(id) : null;
  }
  if (fallbackId != null) return typeof fallbackId === 'string' ? fallbackId : String(fallbackId);
  return null;
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

function operationToAction(operation: string): 'create' | 'update' | 'delete' | null {
  if (operation === 'create') return 'create';
  if (operation === 'update') return 'update';
  if (operation === 'delete') return 'delete';
  return null;
}

export function createAuditedPrismaClient(params: {
  basePrisma: PrismaClient;
  internalPrisma: PrismaClient;
}) {
  const { basePrisma, internalPrisma } = params;

  return basePrisma.$extends({
    name: 'auditTrail',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const action = operationToAction(operation);
          if (!action || !isAuditedModel(model)) return await query(args);

          const cfg = auditConfig[model];
          if (!cfg.track) return await query(args);

          const ctx = getRequestContext();
          const actorId = ctx?.userId;
          const requestId = ctx?.requestId;
          if (!actorId || !requestId) return await query(args);

          const maybeId = (args as any)?.where?.id;
          let before: unknown = null;
          if (action === 'update' || action === 'delete') {
            if (maybeId) {
              // @ts-expect-error dynamic model access
              before = await internalPrisma[model].findUnique({ where: { id: maybeId } });
            }
          }

          const result = await query(args);

          const entityId = getEntityId(result, maybeId);
          if (!entityId) return result;

          let after: unknown = action === 'delete' ? null : result;
          // If the query used `select` (common for create returning only {id}),
          // fetch the full record so audits contain meaningful before/after state.
          if (action !== 'delete') {
            const looksPartial =
              typeof after === 'object' &&
              after !== null &&
              !Array.isArray(after) &&
              Object.keys(after as any).length <= 1 &&
              'id' in (after as any);
            if (!after || looksPartial) {
              // @ts-expect-error dynamic model access
              const full = await internalPrisma[model].findUnique({ where: { id: entityId } });
              if (full) after = full;
            }
          }
          const inferred = action === 'update' ? inferSoftDeleteAction(before, after) : null;
          const auditAction = inferred ?? action;

          const diff = buildAuditDiff({ before, after, cfg });
          const changedFieldsPacked = diff.changedFields.length
            ? `,${diff.changedFields.join(',')},`
            : '';

          await internalPrisma.auditLog.create({
            data: {
              entity: model,
              entityId,
              action: auditAction,
              actorId,
              requestId,
              route: ctx?.route,
              method: ctx?.method,
              diff: { before: diff.before, after: diff.after, changedFields: diff.changedFields } as any,
              changedFields: changedFieldsPacked
            }
          });

          return result;
        }
      }
    }
  });
}

