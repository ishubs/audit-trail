import { z } from 'zod';

export const bookCreateSchema = z.object({
  title: z.string().min(1),
  authors: z.string().min(1),
  publishedBy: z.string().min(1)
});

export const bookUpdateSchema = bookCreateSchema.partial().refine((v) => Object.keys(v).length > 0, {
  message: 'At least one field must be provided'
});

export const booksListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(10),
  cursor: z.string().optional()
});

