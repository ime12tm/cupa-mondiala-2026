/**
 * Admin Users Data Layer
 *
 * SECURITY: ALL functions in this file are ADMIN-ONLY.
 * Calling components MUST verify admin status before using these functions.
 *
 * See docs/data-fetching.md for admin data patterns.
 */

import { db } from '@/db';
import { users } from '@/db/schema';
import { desc, asc } from 'drizzle-orm';

/**
 * Get all users ordered by total points
 * ADMIN ONLY - Returns all users without filtering
 *
 * SECURITY: Caller MUST verify admin status before calling this function
 *
 * @returns All users ordered by total points (descending)
 */
export async function getAllUsers() {
  return db.query.users.findMany({
    orderBy: [desc(users.totalPoints)],
  });
}

/**
 * Get all users ordered by display name
 * ADMIN ONLY - Returns all users without filtering
 *
 * SECURITY: Caller MUST verify admin status before calling this function
 *
 * @returns All users ordered by display name (alphabetically)
 */
export async function getAllUsersByName() {
  return db.query.users.findMany({
    orderBy: [asc(users.displayName)],
  });
}

/**
 * Get leaderboard with all users
 * ADMIN ONLY - Returns global leaderboard
 *
 * SECURITY: Caller MUST verify admin status before calling this function
 * (Regular users should use the user-specific leaderboard query)
 *
 * @param limit - Maximum number of users to return (default: 100)
 * @returns Users ordered by points
 */
export async function getLeaderboard(limit: number = 100) {
  return db.query.users.findMany({
    orderBy: [desc(users.totalPoints)],
    limit,
  });
}
