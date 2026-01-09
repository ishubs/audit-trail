import { decodeCursor, encodeCursor } from '../../utils/cursor.js';
import type { AuthUser } from '../users/userService.js';
import * as bookRepo from './repository.js';

export async function listBooks(params: { limit: number; cursor?: string }) {
  const cursor = params.cursor ? decodeCursor(params.cursor) : null;
  const items = await bookRepo.listBooks({ limitPlusOne: params.limit + 1, cursor });

  const hasMore = items.length > params.limit;
  const pageItems = hasMore ? items.slice(0, params.limit) : items;
  const nextCursor = hasMore
    ? encodeCursor({
        ts: pageItems[pageItems.length - 1]!.createdAt.toISOString(),
        id: pageItems[pageItems.length - 1]!.id
      })
    : undefined;

  return { items: pageItems, nextCursor };
}

export async function createBook(params: {
  body: { title: string; authors: string; publishedBy: string };
  user: AuthUser;
}) {
  return await bookRepo.createBook({ ...params.body, createdById: params.user.id });
}

export async function getBookById(id: string) {
  return await bookRepo.findBookById(id);
}

export async function updateBook(params: {
  id: string;
  body: { title?: string; authors?: string; publishedBy?: string };
  user: AuthUser;
}) {
  const existing = await bookRepo.findBookById(params.id);
  if (!existing) return null;
  const updated = await bookRepo.updateBook({
    id: params.id,
    data: params.body,
    updatedById: params.user.id
  });
  return updated;
}

export async function deleteBook(params: { id: string; user: AuthUser }) {
  const existing = await bookRepo.findBookById(params.id);
  if (!existing) return null;
  await bookRepo.softDeleteBook({ id: params.id, deletedById: params.user.id });
  return { ok: true } as const;
}

