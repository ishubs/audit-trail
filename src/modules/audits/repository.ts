import mongoose from 'mongoose';

import { AuditLogModel } from '../../db/models/AuditLog.js';
import { stripMongoInternals } from '../../db/models/_shared.js';

export async function listAudits(params: { filter: any; limitPlusOne: number }) {
  const { filter, limitPlusOne } = params;
  const docs = await AuditLogModel.find(filter)
    .sort({ timestamp: -1, _id: -1 })
    .limit(limitPlusOne)
    .lean();
  return docs.map(stripMongoInternals);
}

export async function findAuditById(id: string) {
  if (!mongoose.isValidObjectId(id)) return null;
  const oid = new mongoose.Types.ObjectId(id);
  const doc = await AuditLogModel.findById(oid).lean();
  return doc ? stripMongoInternals(doc) : null;
}

