/**
 * Prisma Database Client
 *
 * Provides a singleton Prisma client instance with hot-reload support
 * for development. The global pattern prevents multiple client instances
 * during hot module replacement in development mode.
 *
 * @module db
 */

import { PrismaClient } from '@prisma/client';
import * as Prisma from '@prisma/client';

/**
 * Global container for Prisma client to prevent multiple instances
 * during hot reload in development.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Singleton Prisma client instance.
 * Reuses existing instance in development, creates new one in production.
 */
export const prisma = globalForPrisma.prisma ?? new PrismaClient();

// Cache the client in development for hot reload support
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Re-export of Prisma namespace for type definitions and enums.
 * Example: `Prisma.UserCreateInput`
 */
export { Prisma };
