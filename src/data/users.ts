/**
 * User Profile Data Layer
 *
 * SECURITY: Functions in this file return user-specific data.
 * Most functions require userId parameter to filter data.
 *
 * See docs/data-fetching.md for data fetching patterns.
 */

import { db } from '@/db';
import { users } from '@/db/schema';
import { eq, gt, count, sql } from 'drizzle-orm';
import { getUserPredictionStats } from './predictions';

/**
 * Get user profile by Clerk user ID
 * SECURITY: Filtered by userId - user can only access their own profile
 *
 * @param userId - Clerk user ID
 * @returns User profile, or null if not found
 */
export async function getUser(userId: string) {
  return db.query.users.findFirst({
    where: eq(users.userId, userId),
  });
}

/**
 * Get comprehensive user statistics
 * SECURITY: Filtered by userId - combines user data with their predictions
 *
 * @param userId - Clerk user ID
 * @returns User profile with prediction statistics
 */
export async function getUserStats(userId: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.userId, userId),
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Get prediction statistics (also user-scoped)
  const predictionStats = await getUserPredictionStats(userId);

  return {
    user,
    ...predictionStats,
    totalPoints: user.totalPoints,
  };
}

/**
 * Get user's leaderboard position
 * SECURITY: Returns only the specific user's rank, not all users
 *
 * @param userId - Clerk user ID
 * @returns User's position in the leaderboard (1-based index)
 */
export async function getUserLeaderboardPosition(userId: string): Promise<number> {
  const user = await getUser(userId);

  if (!user) {
    throw new Error('User not found');
  }

  // Count how many users have more points
  const [result] = await db
    .select({ count: count() })
    .from(users)
    .where(gt(users.totalPoints, user.totalPoints));

  // Position is count of users with more points + 1
  return (result?.count || 0) + 1;
}
