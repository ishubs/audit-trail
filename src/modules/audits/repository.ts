import { prisma } from '../../db/prisma.js';

export async function listAudits(params: { where: any; limitPlusOne: number }) {
  const { where, limitPlusOne } = params;
  return await prisma.auditLog.findMany({
    where,
    orderBy: [{ timestamp: 'desc' }, { id: 'desc' }],
    take: limitPlusOne
  });
}

export async function findAuditById(id: string) {
  return await prisma.auditLog.findUnique({ where: { id } });
}

