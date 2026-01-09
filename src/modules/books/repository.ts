import { prisma } from '../../db/prisma.js';

export type BooksListCursor = { ts: string; id: string };

export async function listBooks(params: { limitPlusOne: number; cursor: BooksListCursor | null }) {
  const { limitPlusOne, cursor } = params;
  return await prisma.book.findMany({
    where: {
      deletedAt: null,
      ...(cursor
        ? {
            OR: [
              { createdAt: { lt: new Date(cursor.ts) } },
              { createdAt: new Date(cursor.ts), id: { lt: cursor.id } }
            ]
          }
        : {})
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limitPlusOne
  });
}

export async function createBook(params: {
  title: string;
  authors: string;
  publishedBy: string;
  createdById: string;
}) {
  const { title, authors, publishedBy, createdById } = params;
  return await prisma.book.create({
    data: { title, authors, publishedBy, createdById },
    select: { id: true }
  });
}

export async function findBookById(id: string) {
  return await prisma.book.findFirst({ where: { id, deletedAt: null } });
}

export async function updateBook(params: {
  id: string;
  data: { title?: string; authors?: string; publishedBy?: string };
  updatedById: string;
}) {
  const { id, data, updatedById } = params;
  return await prisma.book.update({
    where: { id },
    data: { ...data, updatedById }
  });
}

export async function softDeleteBook(params: { id: string; deletedById: string }) {
  const { id, deletedById } = params;
  await prisma.book.update({
    where: { id },
    data: { deletedAt: new Date(), deletedById }
  });
}

