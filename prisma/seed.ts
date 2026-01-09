import { PrismaClient, type UserRole } from '@prisma/client';

const prisma = new PrismaClient();

function mustGetEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function makeApiKey(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2)}${Math.random()
    .toString(36)
    .slice(2)}`;
}

async function upsertUser(params: { name: string; role: UserRole; apiKey: string }) {
  const existing = await prisma.user.findUnique({ where: { apiKey: params.apiKey } });
  if (existing) return existing;
  return await prisma.user.create({ data: params });
}

async function main() {
  mustGetEnv('DATABASE_URL');

  // Fixed keys for demo repeatability. You can rotate these in real life.
  const adminKey = process.env.SEED_ADMIN_API_KEY ?? 'admin_demo_key';
  const reviewerKey = process.env.SEED_REVIEWER_API_KEY ?? 'reviewer_demo_key';

  const admin = await upsertUser({ name: 'Admin User', role: 'admin', apiKey: adminKey });
  const reviewer = await upsertUser({
    name: 'Reviewer User',
    role: 'reviewer',
    apiKey: reviewerKey
  });

  const books = [
    { title: 'Clean Architecture Notes', authors: 'Robert C. Martin', publishedBy: 'Pearson' },
    { title: 'The Pragmatic Programmer', authors: 'Andrew Hunt, David Thomas', publishedBy: 'Addison-Wesley' },
    { title: 'Domain-Driven Design', authors: 'Eric Evans', publishedBy: 'Addison-Wesley' }
  ];

  const existingBooks = await prisma.book.count();
  if (existingBooks === 0) {
    for (const b of books) {
      await prisma.book.create({
        data: {
          ...b,
          createdById: reviewer.id
        }
      });
    }
  }

  // Print keys for convenience in local dev
  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        seeded: true,
        admin: { id: admin.id, apiKey: admin.apiKey },
        reviewer: { id: reviewer.id, apiKey: reviewer.apiKey }
      },
      null,
      2
    )
  );
}

main()
  .catch(async (e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

