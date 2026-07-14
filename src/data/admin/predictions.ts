/**
 * Admin Predictions Data Layer
 *
 * SECURITY: ALL functions in this file are ADMIN-ONLY.
 * These must be called only from server actions that verify admin permissions.
 * DO NOT call these directly from pages or client components.
 *
 * See docs/data-fetching.md and docs/data-mutations.md for admin patterns.
 */

import { db } from '@/db';
import { predictions, matches, users, leaderboardSnapshots } from '@/db/schema';
import { eq, and, sql, isNotNull } from 'drizzle-orm';

/**
 * Helper: Calculate result from scores
 */
function calculateResult(homeScore: number, awayScore: number): '1' | 'X' | '2' {
  if (homeScore > awayScore) return '1';
  if (homeScore === awayScore) return 'X';
  return '2';
}

/**
 * Helper: Calculate points for a prediction
 * - Exact score: 2 points
 * - Correct result (1/X/2): 1 point
 * - Wrong: 0 points
 */
function calculatePoints(
  predictedHome: number,
  predictedAway: number,
  actualHome: number,
  actualAway: number
): number {
  // Exact score
  if (predictedHome === actualHome && predictedAway === actualAway) {
    return 2;
  }

  // Correct result
  const predictedResult = calculateResult(predictedHome, predictedAway);
  const actualResult = calculateResult(actualHome, actualAway);

  if (predictedResult === actualResult) {
    return 1;
  }

  // Wrong prediction
  return 0;
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Admin-only: Get prediction by ID with full details
 * ADMIN ONLY - No filtering, returns any prediction
 *
 * SECURITY: Caller MUST verify admin status before calling this function
 *
 * @param predictionId - Prediction ID
 * @returns Prediction with user and match details
 */
export async function adminGetPrediction(predictionId: number) {
  return db.query.predictions.findFirst({
    where: eq(predictions.id, predictionId),
    with: {
      user: true,
      match: {
        with: {
          homeTeam: true,
          awayTeam: true,
          stage: true,
        },
      },
    },
  });
}

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Admin-only: Lock all predictions for a specific match
 * Called when a match starts (kickoff)
 *
 * SECURITY: Caller MUST verify admin status before calling this function
 *
 * @param matchId - Match ID
 * @returns Update result
 */
export async function lockPredictionsForMatch(matchId: number) {
  const result = await db
    .update(predictions)
    .set({ isLocked: true, updatedAt: new Date() })
    .where(eq(predictions.matchId, matchId));

  return result;
}

/**
 * Admin-only: Lock all predictions for matches that are about to start
 * Can be called by a cron job
 *
 * SECURITY: Caller MUST verify admin status before calling this function
 *
 * @returns Number of matches locked
 */
export async function lockUpcomingMatchPredictions() {
  const now = new Date();

  // Find matches that are scheduled to start within the next 15 minutes
  const upcomingMatches = await db
    .select({ id: matches.id })
    .from(matches)
    .where(
      and(
        eq(matches.status, 'scheduled'),
        sql`${matches.scheduledAt} <= ${new Date(now.getTime() + 15 * 60 * 1000)}`
      )
    );

  // Lock predictions for these matches
  for (const match of upcomingMatches) {
    await lockPredictionsForMatch(match.id);
  }

  return upcomingMatches.length;
}

/**
 * Admin-only: Calculate points for all predictions of a finished match
 * Updates predictions table with points earned
 * Updates users table with total points
 *
 * SECURITY: Caller MUST verify admin status before calling this function
 *
 * @param matchId - Match ID
 * @returns Number of predictions processed
 * @throws Error if match is not finished or scores are not set
 */
export async function calculatePointsForMatch(matchId: number) {
  // Get match details with stage
  const match = await db.query.matches.findFirst({
    where: eq(matches.id, matchId),
    with: {
      stage: true,
    },
  });

  if (!match || match.status !== 'finished') {
    throw new Error('Match is not finished or does not exist');
  }

  if (match.homeScore === null || match.awayScore === null) {
    throw new Error('Match scores are not set');
  }

  // Get all predictions for this match
  const matchPredictions = await db.query.predictions.findMany({
    where: eq(predictions.matchId, matchId),
  });

  // Calculate points for each prediction
  for (const prediction of matchPredictions) {
    const points = calculatePoints(
      prediction.homeScore,
      prediction.awayScore,
      match.homeScore,
      match.awayScore
    );

    // Update prediction with points earned
    await db
      .update(predictions)
      .set({
        pointsEarned: points,
        updatedAt: new Date(),
      })
      .where(eq(predictions.id, prediction.id));

    // Use delta to handle re-calculation correctly when a score is corrected
    const oldPoints = prediction.pointsEarned ?? 0;
    const pointsDiff = points - oldPoints;
    await db
      .update(users)
      .set({
        totalPoints: sql`${users.totalPoints} + ${pointsDiff}`,
        updatedAt: new Date(),
      })
      .where(eq(users.userId, prediction.userId));
  }

  return matchPredictions.length;
}

/**
 * Admin-only: Update a prediction by ID
 * Updates the prediction and recalculates user's total points if pointsEarned changes
 *
 * SECURITY: Caller MUST verify admin status before calling this function
 *
 * @param predictionId - Prediction ID
 * @param updates - Fields to update
 * @returns Updated prediction
 */
export async function adminUpdatePrediction(
  predictionId: number,
  updates: {
    homeScore?: number;
    awayScore?: number;
    pointsEarned?: number | null;
    isLocked?: boolean;
  }
) {
  // Get the existing prediction
  const existingPrediction = await db.query.predictions.findFirst({
    where: eq(predictions.id, predictionId),
  });

  if (!existingPrediction) {
    throw new Error('Prediction not found');
  }

  // Calculate new result if scores are being updated
  let result = existingPrediction.result;
  if (updates.homeScore !== undefined && updates.awayScore !== undefined) {
    result = calculateResult(updates.homeScore, updates.awayScore);
  } else if (updates.homeScore !== undefined) {
    result = calculateResult(updates.homeScore, existingPrediction.awayScore);
  } else if (updates.awayScore !== undefined) {
    result = calculateResult(existingPrediction.homeScore, updates.awayScore);
  }

  // Update the prediction
  const [updated] = await db
    .update(predictions)
    .set({
      ...updates,
      result,
      updatedAt: new Date(),
    })
    .where(eq(predictions.id, predictionId))
    .returning();

  // If pointsEarned changed, recalculate user's total points
  if (
    updates.pointsEarned !== undefined &&
    updates.pointsEarned !== existingPrediction.pointsEarned
  ) {
    const oldPoints = existingPrediction.pointsEarned ?? 0;
    const newPoints = updates.pointsEarned ?? 0;
    const pointsDiff = newPoints - oldPoints;

    await db
      .update(users)
      .set({
        totalPoints: sql`${users.totalPoints} + ${pointsDiff}`,
        updatedAt: new Date(),
      })
      .where(eq(users.userId, existingPrediction.userId));
  }

  return updated;
}

/**
 * Admin-only: Create or overwrite a prediction on behalf of a user
 * Bypasses the match-scheduled and prediction-lock checks that apply to
 * normal users, so admins can enter picks for users who missed the deadline.
 * Does not touch isLocked or pointsEarned - use adminUpdatePrediction for that.
 *
 * SECURITY: Caller MUST verify admin status before calling this function
 *
 * @param data - Target user/match and the scores to record
 * @returns The created or updated prediction
 */
export async function adminUpsertPrediction(data: {
  userId: string;
  matchId: number;
  homeScore: number;
  awayScore: number;
}) {
  const result = calculateResult(data.homeScore, data.awayScore);

  const existing = await db.query.predictions.findFirst({
    where: and(
      eq(predictions.userId, data.userId),
      eq(predictions.matchId, data.matchId)
    ),
  });

  if (existing) {
    const [updated] = await db
      .update(predictions)
      .set({
        homeScore: data.homeScore,
        awayScore: data.awayScore,
        result,
        updatedAt: new Date(),
      })
      .where(eq(predictions.id, existing.id))
      .returning();

    return updated;
  }

  const [created] = await db
    .insert(predictions)
    .values({
      userId: data.userId,
      matchId: data.matchId,
      homeScore: data.homeScore,
      awayScore: data.awayScore,
      result,
      isLocked: false,
      pointsEarned: null,
    })
    .returning();

  return created;
}

/**
 * Admin-only: Delete a prediction by ID
 * Removes the points from user's total if prediction had points
 *
 * SECURITY: Caller MUST verify admin status before calling this function
 *
 * @param predictionId - Prediction ID
 * @returns { success: true, deletedPrediction }
 */
export async function adminDeletePrediction(predictionId: number) {
  // Get the prediction to check if it has points
  const prediction = await db.query.predictions.findFirst({
    where: eq(predictions.id, predictionId),
  });

  if (!prediction) {
    throw new Error('Prediction not found');
  }

  // If prediction had points, subtract them from user's total
  if (prediction.pointsEarned !== null && prediction.pointsEarned > 0) {
    await db
      .update(users)
      .set({
        totalPoints: sql`${users.totalPoints} - ${prediction.pointsEarned}`,
        updatedAt: new Date(),
      })
      .where(eq(users.userId, prediction.userId));
  }

  // Delete the prediction
  await db.delete(predictions).where(eq(predictions.id, predictionId));

  return { success: true, deletedPrediction: prediction };
}

/**
 * Admin-only: Recalculate ALL points from scratch
 * Resets users.totalPoints to 0, then re-derives it from match results.
 * Also corrects predictions.pointsEarned for all finished matches.
 * Does NOT modify user prediction scores (homeScore/awayScore).
 *
 * SECURITY: Caller MUST verify admin status before calling this function
 *
 * @returns Stats about the recalculation
 */
export async function recalculateAllPoints() {
  // Reset all users' totalPoints to 0
  await db.update(users).set({ totalPoints: 0, updatedAt: new Date() });

  // Get all finished matches
  const finishedMatches = await db
    .select()
    .from(matches)
    .where(eq(matches.status, 'finished'));

  let matchesProcessed = 0;
  let predictionsProcessed = 0;

  for (const match of finishedMatches) {
    if (match.homeScore === null || match.awayScore === null) continue;

    const matchPredictions = await db
      .select()
      .from(predictions)
      .where(eq(predictions.matchId, match.id));

    for (const prediction of matchPredictions) {
      const points = calculatePoints(
        prediction.homeScore,
        prediction.awayScore,
        match.homeScore,
        match.awayScore
      );

      await db
        .update(predictions)
        .set({ pointsEarned: points, updatedAt: new Date() })
        .where(eq(predictions.id, prediction.id));

      if (points > 0) {
        await db
          .update(users)
          .set({
            totalPoints: sql`${users.totalPoints} + ${points}`,
            updatedAt: new Date(),
          })
          .where(eq(users.userId, prediction.userId));
      }

      predictionsProcessed++;
    }

    matchesProcessed++;
  }

  // Null out pointsEarned for predictions on non-finished matches
  // (handles the case where a match result was later reverted)
  await db
    .update(predictions)
    .set({ pointsEarned: null, updatedAt: new Date() })
    .where(
      and(
        isNotNull(predictions.pointsEarned),
        sql`${predictions.matchId} IN (SELECT id FROM matches WHERE status != 'finished')`
      )
    );

  return { matchesProcessed, predictionsProcessed };
}

/**
 * Admin-only: Delete ALL predictions and reset user points
 * WARNING: This is a destructive operation that cannot be undone
 *
 * SECURITY: Caller MUST verify admin status before calling this function
 *
 * @param options - Options for clearing leaderboard and resetting match results
 * @returns Statistics about the deletion
 */
export async function adminDeleteAllPredictions(options: {
  clearLeaderboard?: boolean;
  resetMatchResults?: boolean;
}) {
  try {
    // Get statistics before deletion
    const [predictionStats] = await db
      .select({
        totalPredictions: sql<number>`count(*)`,
        usersWithPredictions: sql<number>`count(distinct user_id)`,
        totalPointsAwarded: sql<number>`sum(coalesce(points_earned, 0))`,
      })
      .from(predictions);

    // Get match statistics before reset
    const [matchStats] = await db
      .select({
        totalMatches: sql<number>`count(*)`,
        finishedMatches: sql<number>`count(*) filter (where status = 'finished')`,
        liveMatches: sql<number>`count(*) filter (where status = 'live')`,
      })
      .from(matches);

    // Delete all predictions
    await db.delete(predictions);

    // Reset all users' totalPoints to 0
    await db
      .update(users)
      .set({
        totalPoints: 0,
        updatedAt: new Date(),
      });

    // Reset all match results if requested
    let matchesReset = 0;
    if (options.resetMatchResults) {
      await db
        .update(matches)
        .set({
          homeScore: null,
          awayScore: null,
          homeScorePenalty: null,
          awayScorePenalty: null,
          status: 'scheduled',
        });
      matchesReset = matchStats.finishedMatches + matchStats.liveMatches;
    }

    // Clear leaderboard snapshots if requested
    if (options.clearLeaderboard) {
      await db.delete(leaderboardSnapshots);
    }

    return {
      success: true,
      stats: {
        predictionsDeleted: predictionStats.totalPredictions,
        usersAffected: predictionStats.usersWithPredictions,
        pointsReset: predictionStats.totalPointsAwarded,
        matchesReset: matchesReset,
        leaderboardCleared: options.clearLeaderboard,
      },
    };
  } catch (error) {
    console.error('Error deleting all predictions:', error);
    throw new Error(
      `Failed to delete all predictions: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
