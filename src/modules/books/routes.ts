import { type FastifyInstance } from 'fastify';

import { prisma } from '../../db/prisma.js';
import { enterWithRequestContext } from '../../context/requestContext.js';
import { decodeCursor, encodeCursor } from '../../utils/cursor.js';
import { bookCreateSchema, booksListQuerySchema, bookUpdateSchema } from './schemas.js';

export async function registerBookRoutes(app: FastifyInstance) {
  app.get('/api/books', async (req, reply) => {
    if (req.requestContext) enterWithRequestContext(req.requestContext);
    const query = booksListQuerySchema.parse(req.query);

    const cursor = query.cursor ? decodeCursor(query.cursor) : null;
    const items = await prisma.book.findMany({
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
      take: query.limit + 1
    });

    const hasMore = items.length > query.limit;
    const pageItems = hasMore ? items.slice(0, query.limit) : items;
    const nextCursor = hasMore
      ? encodeCursor({
          ts: pageItems[pageItems.length - 1]!.createdAt.toISOString(),
          id: pageItems[pageItems.length - 1]!.id
        })
      : undefined;

    return reply.send({ items: pageItems, nextCursor });
  });

  app.post('/api/books', async (req, reply) => {
    if (req.requestContext) enterWithRequestContext(req.requestContext);
    const body = bookCreateSchema.parse(req.body);
    const user = req.user!;

    const created = await prisma.book.create({
      data: {
        ...body,
        createdById: user.id
      },
      select: { id: true }
    });

    return reply.code(201).send(created);
  });

  app.get('/api/books/:id', async (req, reply) => {
    if (req.requestContext) enterWithRequestContext(req.requestContext);
    const id = (req.params as any).id as string;
    const book = await prisma.book.findFirst({ where: { id, deletedAt: null } });
    if (!book) return reply.notFound('Book not found');
    return reply.send(book);
  });

  app.patch('/api/books/:id', async (req, reply) => {
    if (req.requestContext) enterWithRequestContext(req.requestContext);
    const id = (req.params as any).id as string;
    const body = bookUpdateSchema.parse(req.body);
    const user = req.user!;

    const existing = await prisma.book.findFirst({ where: { id, deletedAt: null } });
    if (!existing) return reply.notFound('Book not found');

    const updated = await prisma.book.update({
      where: { id },
      data: {
        ...body,
        updatedById: user.id
      }
    });

    return reply.send(updated);
  });

  app.delete('/api/books/:id', async (req, reply) => {
    if (req.requestContext) enterWithRequestContext(req.requestContext);
    const id = (req.params as any).id as string;
    const user = req.user!;

    const existing = await prisma.book.findFirst({ where: { id, deletedAt: null } });
    if (!existing) return reply.notFound('Book not found');

    await prisma.book.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedById: user.id
      }
    });

    return reply.send({ ok: true });
  });
}

