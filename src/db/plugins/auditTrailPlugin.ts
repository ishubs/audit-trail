import type mongoose from 'mongoose';

import { type AuditableEntity } from '../../config/auditConfig.js';
import { writeAudit } from '../auditWriter.js';
import { toPublicId } from '../models/_shared.js';

type PluginOptions = {
  entity: AuditableEntity;
};

function stripPrivateKeys(doc: any): any {
  // We keep full docs here; redaction/exclusion is handled inside `writeAudit()` via `auditConfig`.
  // This just reduces obvious Mongoose internals if present.
  if (!doc || typeof doc !== 'object') return doc;
  const { __v: _v, ...rest } = doc;
  return rest;
}

export function auditTrailPlugin(schema: mongoose.Schema, opts: PluginOptions) {
  const entity = opts.entity;

  // --- CREATE/UPDATE via document save() ---
  schema.pre('save', function (next) {
    const doc: any = this;
    doc.$locals.__audit_isNew = doc.isNew === true;
    doc.$locals.__audit_before = doc.isNew ? null : stripPrivateKeys(doc.toObject({ depopulate: true, getters: false }));
    next();
  });

  schema.post('save', async function () {
    const doc: any = this;
    const isNew = Boolean(doc.$locals.__audit_isNew);
    const before = doc.$locals.__audit_before ?? null;
    const after = stripPrivateKeys(doc.toObject({ depopulate: true, getters: false }));
    const entityId = toPublicId(after);

    await writeAudit({
      entity,
      entityId,
      action: isNew ? 'create' : 'update',
      before,
      after
    });
  });

  // --- UPDATE via findOneAndUpdate() ---
  schema.pre('findOneAndUpdate', async function () {
    const q: any = this;
    // Ensure the post hook receives the updated document.
    q.setOptions({ new: true });

    const filter = q.getFilter?.() ?? {};
    const before = await q.model.findOne(filter).lean();
    q.__audit_before = before ? stripPrivateKeys(before) : null;
  });

  schema.post('findOneAndUpdate', async function (res: any) {
    const q: any = this;
    const before = q.__audit_before ?? null;
    const after = res ? stripPrivateKeys(res) : null;
    const entityId = toPublicId(after ?? before);
    if (!entityId) return;

    await writeAudit({
      entity,
      entityId,
      action: 'update',
      before,
      after
    });
  });

  // --- HARD DELETE hooks (optional; main app uses soft-delete) ---
  schema.pre('findOneAndDelete', async function () {
    const q: any = this;
    const filter = q.getFilter?.() ?? {};
    const before = await q.model.findOne(filter).lean();
    q.__audit_before = before ? stripPrivateKeys(before) : null;
  });

  schema.post('findOneAndDelete', async function (res: any) {
    const q: any = this;
    const before = q.__audit_before ?? null;
    const after = null;
    const entityId = toPublicId(res ?? before);
    if (!entityId) return;

    await writeAudit({
      entity,
      entityId,
      action: 'delete',
      before,
      after
    });
  });
}

