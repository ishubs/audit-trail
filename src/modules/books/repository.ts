import mongoose from 'mongoose';

import { BookModel } from '../../db/models/Book.js';
import { stripMongoInternals } from '../../db/models/_shared.js';

export type BooksListCursor = { ts: string; id: string };

function toObjectId(id: string): mongoose.Types.ObjectId | null {
  if (!mongoose.isValidObjectId(id)) return null;
  return new mongoose.Types.ObjectId(id);
}

export async function listBooks(params: { limitPlusOne: number; cursor: BooksListCursor | null }) {
  const { limitPlusOne, cursor } = params;
  const filter: any = { deletedAt: null };
  if (cursor) {
    const cursorId = toObjectId(cursor.id);
    if (cursorId) {
      const cursorTs = new Date(cursor.ts);
      filter.$or = [
        { createdAt: { $lt: cursorTs } },
        { createdAt: { $eq: cursorTs }, _id: { $lt: cursorId } }
      ];
    }
  }

  const docs = await BookModel.find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .limit(limitPlusOne)
    .lean();

  return docs.map(stripMongoInternals);
}

export async function createBook(params: {
  title: string;
  authors: string;
  publishedBy: string;
  createdById: string;
}) {
  const { title, authors, publishedBy, createdById } = params;
  const created = await BookModel.create({ title, authors, publishedBy, createdById });
  const after = stripMongoInternals(created.toObject());
  return { id: after.id };
}

export async function findBookById(id: string) {
  const oid = toObjectId(id);
  if (!oid) return null;
  const doc = await BookModel.findOne({ _id: oid, deletedAt: null }).lean();
  return doc ? stripMongoInternals(doc) : null;
}

export async function updateBook(params: {
  id: string;
  data: { title?: string; authors?: string; publishedBy?: string };
  updatedById: string;
}) {
  const { id, data, updatedById } = params;
  const oid = toObjectId(id);
  if (!oid) return null;
  const doc = await BookModel.findOneAndUpdate(
    { _id: oid },
    { $set: { ...data, updatedById } },
    { new: true }
  ).lean();
  if (!doc) return null;
  const after = stripMongoInternals(doc);
  return after;
}

export async function softDeleteBook(params: { id: string; deletedById: string }) {
  const { id, deletedById } = params;
  const oid = toObjectId(id);
  if (!oid) return;
  await BookModel.findOneAndUpdate(
    { _id: oid },
    { $set: { deletedAt: new Date(), deletedById } },
    { new: true }
  ).lean();
}

