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

  if (env.LOG_SINK === 'file') {
    return {
      ...base,
      transport: { target: 'pino/file', options: { destination: env.LOG_FILE, mkdir: true } }
    } as LoggerOptions;
  }

  // Placeholder "remote sinks":
  // In real deployments you'd typically ship JSON logs from stdout to a collector/agent (Elastic/Logtail/etc).
  // We keep the behavior distinct from LOG_SINK=file and make it note-worthy in logs via `logSink`.
  const baseWithSink: LoggerOptions = {
    ...base,
    mixin() {
      const ctx = getRequestContext();
      const core = ctx ? { requestId: ctx.requestId, userId: ctx.userId } : {};
      return { ...core, logSink: env.LOG_SINK };
    }
  };

  if (env.LOG_SINK === 'elastic' || env.LOG_SINK === 'logtail') {
    // JSON to stdout (collector picks it up).
    return {
      ...baseWithSink,
      transport: { target: 'pino/file', options: { destination: 1 } }
    } as LoggerOptions;
  }

  // Safety fallback
  return {
    ...base,
    transport: { target: 'pino/file', options: { destination: env.LOG_FILE, mkdir: true } }
  } as LoggerOptions;
}

