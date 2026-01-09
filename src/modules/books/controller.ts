import type { FastifyReply, FastifyRequest } from 'fastify';

import { bookCreateSchema, booksListQuerySchema, bookUpdateSchema } from './schemas.js';
import * as bookService from './service.js';

export async function listBooksController(req: FastifyRequest, reply: FastifyReply) {
  const query = booksListQuerySchema.parse(req.query);
  const result = await bookService.listBooks(query);
  return reply.send(result);
}

export async function createBookController(req: FastifyRequest, reply: FastifyReply) {
  const body = bookCreateSchema.parse(req.body);
  const user = req.user!;
  const created = await bookService.createBook({ body, user });
  return reply.code(201).send(created);
}

export async function getBookController(req: FastifyRequest, reply: FastifyReply) {
  const id = (req.params as any).id as string;
  const book = await bookService.getBookById(id);
  if (!book) return reply.notFound('Book not found');
  return reply.send(book);
}

export async function updateBookController(req: FastifyRequest, reply: FastifyReply) {
  const id = (req.params as any).id as string;
  const body = bookUpdateSchema.parse(req.body);
  const user = req.user!;

  const updated = await bookService.updateBook({ id, body, user });
  if (!updated) return reply.notFound('Book not found');
  return reply.send(updated);
}

export async function deleteBookController(req: FastifyRequest, reply: FastifyReply) {
  const id = (req.params as any).id as string;
  const user = req.user!;

  const result = await bookService.deleteBook({ id, user });
  if (!result) return reply.notFound('Book not found');
  return reply.send(result);
}

