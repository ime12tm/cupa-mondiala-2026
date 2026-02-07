import { auth, clerkClient } from '@clerk/nextjs/server';
import { ensureUserExists } from '@/db/queries';

/**
 * Check if the current user has admin role
 * Admin role is stored in Clerk user's publicMetadata: { role: "admin" }
 */
export async function isAdmin(): Promise<boolean> {
  const { userId } = await auth();
  if (!userId) return false;

  try {
    const user = await (await clerkClient()).users.getUser(userId);
    return user.publicMetadata?.role === 'admin';
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

/**
 * Require admin access - throws error if not admin
 * Use in server components/actions that need admin protection
 */
export async function requireAdmin(): Promise<void> {
  const adminStatus = await isAdmin();
  if (!adminStatus) {
    throw new Error('Unauthorized - Admin access required');
  }
}

/**
 * Get current user ID or null if not authenticated
 */
export async function getCurrentUserId(): Promise<string | null> {
  const { userId } = await auth();
  return userId;
}

/**
 * Get current user ID and ensure user exists in database
 * This is the recommended way to get userId for database operations
 * Implements lazy sync pattern to handle webhook delays
 */
export async function getCurrentUserIdAndSync(): Promise<string | null> {
  const { userId } = await auth();
  if (!userId) return null;

  try {
    // Ensure user exists in database (lazy sync)
    await ensureUserExists(userId);
    return userId;
  } catch (error) {
    console.error('Error syncing user to database:', error);
    throw new Error('Failed to sync user account. Please try again.');
  }
}
