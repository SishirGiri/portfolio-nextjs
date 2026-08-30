import { PrismaClient } from '@prisma/client';

/**
 * Prisma singleton for the Neon Drive game API.
 *
 * Every route degrades gracefully when the database is
 * unreachable: `isDbError()` classifies connection failures so
 * handlers can answer 503 `{code:'database_unavailable'}` and
 * the client falls back to local-only play.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export function isDbError(err: unknown): boolean {
  const e = err as { code?: string; message?: string; name?: string; clientVersion?: string };
  const code = e?.code ?? '';
  const message = e?.message ?? '';
  return (
    code === 'P1001' ||   // can't reach database server
    code === 'P1002' ||   // server reached but timed out
    code === 'P1003' ||   // database does not exist
    code.startsWith('P10') ||
    e?.name === 'PrismaClientInitializationError' ||
    /ECONNREFUSED|ETIMEDOUT|ENOTFOUND|ECONNRESET|environment variable not found/i.test(message)
  );
}
