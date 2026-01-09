import type { FastifyReply, FastifyRequest } from 'fastify';

import { auditsListQuerySchema } from './schemas.js';
import * as auditService from './service.js';

export async function listAuditsController(req: FastifyRequest, reply: FastifyReply) {
  const query = auditsListQuerySchema.parse(req.query);
  const result = await auditService.listAudits(query);
  return reply.send(result);
}

export async function getAuditController(req: FastifyRequest, reply: FastifyReply) {
  const id = (req.params as any).id as string;
  const audit = await auditService.getAuditById(id);
  if (!audit) return reply.notFound('Audit not found');
  return reply.send(audit);
}

