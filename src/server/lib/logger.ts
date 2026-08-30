/**
 * Structured logging — pino with service-tagged child loggers.
 *
 *   • one logger per service: web API, realtime, workers
 *   • level via LOG_LEVEL (debug | info | warn | error)
 *   • request-scoped context via logger.child({ requestId, userId })
 *   • never log passwords, tokens or hashes — callers must not
 *     pass them; token payloads only ever appear truncated
 */
import pino from 'pino';

const level = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

export const logger = pino({
  level,
  base: { service: 'neon-drive-web' },
  timestamp: pino.stdTimeFunctions.isoTime,
  // keep errors readable in dev, single-line JSON in prod
  ...(process.env.NODE_ENV === 'production' ? {} : {
    transport: undefined,
    messageFormat: undefined,
  }),
});

export function childLogger(bindings: Record<string, unknown>) {
  return logger.child(bindings);
}

/** Realtime service logger (separate tag so logs are filterable). */
export const realtimeLogger = pino({
  level,
  base: { service: 'neon-drive-realtime' },
  timestamp: pino.stdTimeFunctions.isoTime,
});
