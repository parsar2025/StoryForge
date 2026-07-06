import { PrismaClient } from '@prisma/client';

/**
 * Prisma client singleton
 * 
 * Ensures a single PrismaClient instance is reused across the application,
 * preventing connection exhaustion during development hot reloads.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
