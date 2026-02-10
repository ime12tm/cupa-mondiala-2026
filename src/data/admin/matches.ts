/**
 * Admin Matches Data Layer
 *
 * SECURITY: Functions in this file are for ADMIN USE ONLY.
 * These must be called only from server actions that verify admin permissions.
 * DO NOT call these directly from pages or client components.
 *
 * See docs/data-fetching.md for data fetching patterns.
 */

import { db } from '@/db';
import { matches } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Admin-only: Update match result
 * SECURITY: Must be called from admin-protected server action
 *
 * @param data - Match result data
 * @returns Updated match
 */
export async function updateMatchResult(data: {
  matchId: number;
  homeScore: number;
  awayScore: number;
  status: 'live' | 'finished';
}) {
  const [updated] = await db
    .update(matches)
    .set({
      homeScore: data.homeScore,
      awayScore: data.awayScore,
      status: data.status,
    })
    .where(eq(matches.id, data.matchId))
    .returning();

  return updated;
}
