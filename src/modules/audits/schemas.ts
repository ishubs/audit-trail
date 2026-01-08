import { z } from 'zod';

export const auditsListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),

  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),

  entity: z.string().min(1).optional(),
  entityId: z.string().min(1).optional(),
  actorId: z.string().min(1).optional(),
  action: z.enum(['create', 'update', 'delete', 'restore', 'login']).optional(),
  fieldsChanged: z.string().min(1).optional(),
  requestId: z.string().min(1).optional()
});

