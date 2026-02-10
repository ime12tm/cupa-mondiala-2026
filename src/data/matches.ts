/**
 * Matches Data Layer
 *
 * SECURITY: Functions in this file return PUBLIC data (matches, teams, venues).
 * No userId filtering needed since match data is visible to all users.
 *
 * See docs/data-fetching.md for data fetching patterns.
 */

import { db } from '@/db';
import { matches, tournamentStages } from '@/db/schema';
import { eq, and, sql, asc, count } from 'drizzle-orm';

/**
 * Get all matches with full details
 * PUBLIC DATA - No authentication required
 *
 * @returns All matches ordered by scheduled date
 */
export async function getMatches() {
  return db.query.matches.findMany({
    orderBy: [asc(matches.scheduledAt)],
    with: {
      homeTeam: true,
      awayTeam: true,
      venue: true,
      stage: true,
    },
  });
}

/**
 * Get a specific match by ID
 * PUBLIC DATA - No authentication required
 *
 * @param matchId - Match ID
 * @returns Match with full details, or null if not found
 */
export async function getMatch(matchId: number) {
  return db.query.matches.findFirst({
    where: eq(matches.id, matchId),
    with: {
      homeTeam: true,
      awayTeam: true,
      venue: true,
      stage: true,
    },
  });
}

/**
 * Get upcoming matches (scheduled in the future)
 * PUBLIC DATA - No authentication required
 *
 * @param limit - Maximum number of matches to return (default: 10)
 * @returns Upcoming matches ordered by date
 */
export async function getUpcomingMatches(limit: number = 10) {
  const now = new Date();

  return db.query.matches.findMany({
    where: and(
      eq(matches.status, 'scheduled'),
      sql`${matches.scheduledAt} > ${now}`
    ),
    with: {
      homeTeam: true,
      awayTeam: true,
      venue: true,
      stage: true,
    },
    orderBy: [asc(matches.scheduledAt)],
    limit,
  });
}

/**
 * Get all group stage matches
 * PUBLIC DATA - No authentication required
 *
 * @returns Group stage matches with full details
 */
export async function getGroupStageMatches() {
  const groupStage = await db.query.tournamentStages.findFirst({
    where: eq(tournamentStages.slug, 'group_stage'),
  });

  if (!groupStage) {
    return [];
  }

  return db.query.matches.findMany({
    where: eq(matches.stageId, groupStage.id),
    with: {
      homeTeam: true,
      awayTeam: true,
      venue: true,
      stage: true,
    },
    orderBy: [asc(matches.scheduledAt)],
  });
}

/**
 * Get the first group stage match (tournament opening match)
 * PUBLIC DATA - Cached, never changes
 *
 * @returns First match of the tournament
 */
export async function getFirstGroupStageMatch() {
  const groupStage = await db.query.tournamentStages.findFirst({
    where: eq(tournamentStages.slug, 'group_stage'),
  });

  if (!groupStage) {
    throw new Error('Group stage not found');
  }

  const firstMatch = await db.query.matches.findFirst({
    where: eq(matches.stageId, groupStage.id),
    with: {
      stage: true,
      venue: true,
      homeTeam: true,
      awayTeam: true,
    },
    orderBy: [asc(matches.scheduledAt)],
  });

  if (!firstMatch) {
    throw new Error('First group stage match not found');
  }

  return firstMatch;
}

/**
 * Get matches filtered by status
 * PUBLIC DATA - No authentication required
 *
 * @param status - Match status to filter by
 * @returns Matches with the specified status
 */
export async function getMatchesByStatus(status: 'scheduled' | 'live' | 'finished') {
  return db.query.matches.findMany({
    where: eq(matches.status, status),
    with: {
      homeTeam: true,
      awayTeam: true,
      venue: true,
      stage: true,
    },
    orderBy: [asc(matches.scheduledAt)],
  });
}

/**
 * Get match statistics (total, scheduled, live, finished counts)
 * PUBLIC DATA - No authentication required
 *
 * @returns Counts for each match status
 */
export async function getMatchStatistics() {
  const [totalMatches] = await db
    .select({ count: count() })
    .from(matches);

  const [scheduledMatches] = await db
    .select({ count: count() })
    .from(matches)
    .where(eq(matches.status, 'scheduled'));

  const [liveMatches] = await db
    .select({ count: count() })
    .from(matches)
    .where(eq(matches.status, 'live'));

  const [finishedMatches] = await db
    .select({ count: count() })
    .from(matches)
    .where(eq(matches.status, 'finished'));

  return {
    total: totalMatches?.count || 0,
    scheduled: scheduledMatches?.count || 0,
    live: liveMatches?.count || 0,
    finished: finishedMatches?.count || 0,
  };
}
