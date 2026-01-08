import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3004),
  DATABASE_URL: z.string().min(1),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
  LOG_SINK: z.enum(['file', 'pretty', 'elastic', 'logtail']).default('file'),
  LOG_FILE: z.string().min(1).default('./logs/app.log')
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(input: NodeJS.ProcessEnv): Env {
  const parsed = envSchema.safeParse(input);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => ({
      path: i.path.join('.'),
      message: i.message
    }));
    const msg = `Invalid environment variables: ${JSON.stringify(issues)}`;
    // eslint-disable-next-line no-console
    console.error(msg);
    throw new Error(msg);
  }
  return parsed.data;
}

