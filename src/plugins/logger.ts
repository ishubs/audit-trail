import { type LoggerOptions } from 'pino';

import { type Env } from '../config/env.js';
import { getRequestContext } from '../context/requestContext.js';

export function buildLoggerOptions(env: Env): LoggerOptions {
  const base: LoggerOptions = {
    level: env.LOG_LEVEL,
    base: null,
    redact: {
      paths: ['req.headers["x-api-key"]', 'req.headers.authorization'],
      censor: '[REDACTED]'
    },
    formatters: {
      level(label) {
        return { level: label };
      }
    },
    mixin() {
      const ctx = getRequestContext();
      return ctx ? { requestId: ctx.requestId, userId: ctx.userId } : {};
    }
  };

  if (env.LOG_SINK === 'pretty') {
    return {
      ...base,
      transport: { target: 'pino-pretty', options: { colorize: true } }
    } as LoggerOptions;
  }

  // Default to file logging (also used as fallback for stubbed sinks)
  // NOTE: Pino disallows custom `formatters.level` when using `transport.targets`.
  // We only have a single destination, so use `transport.target`.
  const fileTransport = {
    target: 'pino/file',
    options: { destination: env.LOG_FILE, mkdir: true }
  };

  return { ...base, transport: fileTransport } as LoggerOptions;
}

