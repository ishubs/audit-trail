import { PrismaClient } from '@prisma/client';

import { createAuditedPrismaClient } from './auditMiddleware.js';

export const internalPrisma = new PrismaClient();
const basePrisma = new PrismaClient();

export const prisma = createAuditedPrismaClient({ basePrisma, internalPrisma });
