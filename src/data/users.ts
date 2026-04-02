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

// ============================================================================
// USER SYNC (Clerk Integration)
// ============================================================================

/**
 * Create or update a user from Clerk webhook
 * Called from Clerk webhook when user is created/updated
 *
 * @param clerkData - User data from Clerk
 * @returns Created or updated user
 */
export async function upsertUserFromClerk(clerkData: {
  id: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
}) {
  const displayName =
    clerkData.username ||
    [clerkData.firstName, clerkData.lastName].filter(Boolean).join(' ') ||
    clerkData.email.split('@')[0];

  // Check if group stage deadline has passed
  const { hasGroupStageDeadlinePassed } = await import('@/data/matches');
  const deadlinePassed = await hasGroupStageDeadlinePassed();

  const [user] = await db
    .insert(users)
    .values({
      userId: clerkData.id,
      email: clerkData.email,
      username: clerkData.username || null,
      displayName,
      totalPoints: 0,
      groupStageDeadlinePassed: deadlinePassed,
    })
    .onConflictDoUpdate({
      target: users.userId,
      set: {
        email: clerkData.email,
        username: clerkData.username || null,
        displayName,
        updatedAt: new Date(),
        // DO NOT update groupStageDeadlinePassed - it's set once at creation
      },
    })
    .returning();

  return user;
}

/**
 * Ensure user exists in database (lazy sync pattern)
 * Fetches user data from Clerk and creates/updates database record
 * Call this before any database operation that requires userId
 *
 * @param userId - Clerk user ID
 * @returns User record from database
 */
export async function ensureUserExists(userId: string) {
  // Check if user already exists
  const existingUser = await db.query.users.findFirst({
    where: eq(users.userId, userId),
  });

  if (existingUser) {
    return existingUser;
  }

  // User doesn't exist, fetch from Clerk and create
  const { clerkClient } = await import('@clerk/nextjs/server');

  try {
    const clerkUser = await (await clerkClient()).users.getUser(userId);

    const primaryEmail = clerkUser.emailAddresses.find(
      (email) => email.id === clerkUser.primaryEmailAddressId
    );

    if (!primaryEmail) {
      throw new Error('No primary email found for user');
    }

    // Create user in database
    return await upsertUserFromClerk({
      id: clerkUser.id,
      email: primaryEmail.emailAddress,
      username: clerkUser.username || undefined,
      firstName: clerkUser.firstName || undefined,
      lastName: clerkUser.lastName || undefined,
    });
  } catch (error) {
    console.error('Error fetching user from Clerk:', error);
    throw new Error('Failed to sync user account');
  }
}
