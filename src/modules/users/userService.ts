import { prisma } from '../../db/prisma.js';

export type AuthUser = {
  id: string;
  name: string;
  role: 'admin' | 'reviewer';
};

export async function findUserByApiKey(apiKey: string): Promise<AuthUser | null> {
  const user = await prisma.user.findUnique({
    where: { apiKey },
    select: { id: true, name: true, role: true }
  });
  return user;
}

