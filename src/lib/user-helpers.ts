/**
 * User Management Helpers
 *
 * Centralized utilities for user-related operations.
 * Reduces duplication of user creation and retrieval patterns.
 */

import { prisma } from "./db";

/**
 * Default user credentials for demo/development mode.
 * In production, these should be configured via environment variables.
 */
export const DEMO_USER = {
  email: "demo@course.design",
  password: "demo", // This will be hashed before storage
  name: "Demo User",
} as const;

/**
 * Gets the first available user, or creates a default demo user if none exists.
 * Useful for MVP/development scenarios where proper authentication isn't implemented yet.
 *
 * @returns The first user or newly created demo user
 *
 * @example
 * ```typescript
 * const user = await getOrCreateDemoUser();
 * const course = await prisma.course.create({
 *   data: { userId: user.id, ... }
 * });
 * ```
 */
export async function getOrCreateDemoUser(): Promise<{
  id: string;
  email: string;
  name: string;
}> {
  // Try to find an existing user
  let user = await prisma.user.findFirst();

  if (!user) {
    // Create default user if none exists
    const bcrypt = await import("bcryptjs");
    user = await prisma.user.create({
      data: {
        email: DEMO_USER.email,
        password: await bcrypt.hash(DEMO_USER.password, 10),
        name: DEMO_USER.name,
      },
    });
  }

  return user;
}

/**
 * Gets a user by ID, or returns null if not found.
 *
 * @param userId - User ID to look up
 * @returns User or null
 */
export async function getUserById(userId: string): Promise<{
  id: string;
  email: string;
  name: string;
} | null> {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true },
  });
}
