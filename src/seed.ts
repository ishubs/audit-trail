import 'dotenv/config';

import { loadEnv } from './config/env.js';
import { connectMongo, disconnectMongo } from './db/mongoose.js';
import { BookModel } from './db/models/Book.js';
import { UserModel } from './db/models/User.js';

function mustGetEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

async function upsertUser(params: { name: string; role: 'admin' | 'reviewer'; apiKey: string }) {
  const existing = await UserModel.findOne({ apiKey: params.apiKey });
  if (existing) return existing;
  return await UserModel.create(params);
}

async function dropLegacyEmailUniqueIndexIfPresent() {
  // Some earlier iterations may have created a unique index on `email` in the same collection.
  // Since we no longer use `email`, that index can cause E11000 dup key errors on { email: null }.
  const indexes = await UserModel.collection.indexes();
  const legacy = indexes.find((i) => i.name === 'email_1');
  if (legacy) {
    // eslint-disable-next-line no-console
    console.log('[seed] Dropping legacy index: email_1');
    await UserModel.collection.dropIndex('email_1');
  }
}

async function main() {
  // validates DATABASE_URL and log envs
  const env = loadEnv(process.env);
  await connectMongo({ databaseUrl: env.DATABASE_URL });

  await dropLegacyEmailUniqueIndexIfPresent();

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

  const existingBooks = await BookModel.countDocuments({});
  if (existingBooks === 0) {
    for (const b of books) {
      await BookModel.create({
        ...b,
        createdById: reviewer._id.toString()
      });
    }
  }

  // Print keys for convenience in local dev
  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        seeded: true,
        admin: { id: admin._id.toString(), apiKey: adminKey },
        reviewer: { id: reviewer._id.toString(), apiKey: reviewerKey }
      },
      null,
      2
    )
  );
}

mustGetEnv('DATABASE_URL');

main()
  .catch(async (e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectMongo();
  });

