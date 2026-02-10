/**
 * User Predictions Data Layer
 *
 * SECURITY: All functions in this file MUST filter by userId to ensure
 * users can only access their own prediction data.
 *
 * See docs/data-fetching.md for data fetching patterns (queries).
 * See docs/data-mutations.md for mutation patterns (create, update, delete).
 */

import { db } from '@/db';
import { predictions, matches } from '@/db/schema';
import { eq, and, asc } from 'drizzle-orm';

/**
 * Get all predictions for a specific user
 * SECURITY: Filtered by userId - user can only see their own predictions
 *
 * @param userId - Clerk user ID
 * @returns User's predictions with match details (teams, venue, stage)
 */
export async function getUserPredictions(userId: string) {
  return db.query.predictions.findMany({
    where: eq(predictions.userId, userId),
    with: {
      match: {
        with: {
          homeTeam: true,
          awayTeam: true,
          venue: true,
          stage: true,
        },
      },
    },
    orderBy: [asc(predictions.createdAt)],
  });
}

/**
 * Get a specific prediction for a user
 * SECURITY: Filtered by both userId AND matchId
 *
 * @param userId - Clerk user ID
 * @param matchId - Match ID
 * @returns User's prediction for this match, or null if not found
 */
export async function getUserPrediction(userId: string, matchId: number) {
  return db.query.predictions.findFirst({
    where: and(
      eq(predictions.userId, userId),
      eq(predictions.matchId, matchId)
    ),
  });
}

/**
 * Get user statistics for their predictions
 * SECURITY: Filtered by userId
 *
 * @param userId - Clerk user ID
 * @returns Stats including total predictions, exact scores, correct results (excluding exact scores)
 */
export async function getUserPredictionStats(userId: string) {
  const userPredictions = await db.query.predictions.findMany({
    where: eq(predictions.userId, userId),
  });

  const totalPredictions = userPredictions.length;
  const completedPredictions = userPredictions.filter(
    (p) => p.pointsEarned !== null
  );
  const exactScores = completedPredictions.filter(
    (p) => p.pointsEarned! >= 3
  ).length;
  const correctResults = completedPredictions.filter(
    (p) => p.pointsEarned! >= 1 && p.pointsEarned! < 3
  ).length;

  return {
    totalPredictions,
    completedPredictions: completedPredictions.length,
    exactScores,
    correctResults,
  };
}

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Helper: Calculate result from scores
 */
function calculateResult(homeScore: number, awayScore: number): '1' | 'X' | '2' {
  if (homeScore > awayScore) return '1';
  if (homeScore === awayScore) return 'X';
  return '2';
}

/**
 * Create a new prediction for a user
 * SECURITY: Requires userId - user can only create their own predictions
 *
 * Called from server actions (see docs/data-mutations.md)
 *
 * @param data - Prediction data with userId
 * @returns Created prediction
 * @throws Error if match not found, already started, or prediction exists
 */
export async function createPrediction(data: {
  userId: string;
  matchId: number;
  homeScore: number;
  awayScore: number;
}) {
  // Validate match exists and is not started
  const match = await db.query.matches.findFirst({
    where: eq(matches.id, data.matchId),
  });

  if (!match) {
    throw new Error('Match not found');
  }

  if (match.status !== 'scheduled') {
    throw new Error('Cannot predict for a match that has started or finished');
  }

  // Check if prediction already exists
  const existing = await db.query.predictions.findFirst({
    where: and(
      eq(predictions.userId, data.userId),
      eq(predictions.matchId, data.matchId)
    ),
  });

  if (existing) {
    throw new Error('Prediction already exists for this match');
  }

  // Calculate result
  const result = calculateResult(data.homeScore, data.awayScore);

  // Create prediction
  const [prediction] = await db
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

  return prediction;
}

/**
 * Update an existing prediction for a user
 * SECURITY: Filters by BOTH userId AND predictionId
 *
 * Called from server actions (see docs/data-mutations.md)
 *
 * @param data - Update data with userId and predictionId
 * @returns Updated prediction
 * @throws Error if prediction not found or not owned by user
 */
export async function updatePrediction(data: {
  userId: string;
  predictionId: number;
  homeScore: number;
  awayScore: number;
}) {
  // Get prediction with match info
  const existing = await db.query.predictions.findFirst({
    where: and(
      eq(predictions.id, data.predictionId),
      eq(predictions.userId, data.userId) // ✅ REQUIRED - User filter
    ),
    with: {
      match: true,
    },
  });

  if (!existing) {
    throw new Error('Prediction not found or access denied');
  }

  // Check if prediction is locked
  if (existing.isLocked) {
    throw new Error('Prediction is locked and cannot be modified');
  }

  // Check if match has started
  if (existing.match.status !== 'scheduled') {
    throw new Error('Cannot update prediction for a match that has started');
  }

  // Calculate new result
  const result = calculateResult(data.homeScore, data.awayScore);

  // Update prediction
  const [updated] = await db
    .update(predictions)
    .set({
      homeScore: data.homeScore,
      awayScore: data.awayScore,
      result,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(predictions.id, data.predictionId),
        eq(predictions.userId, data.userId) // ✅ REQUIRED - User filter
      )
    )
    .returning();

  return updated;
}

/**
 * Delete a prediction for a user
 * SECURITY: Filters by BOTH userId AND predictionId
 *
 * Called from server actions (see docs/data-mutations.md)
 *
 * @param data - Delete data with userId and predictionId
 * @returns Deleted prediction
 * @throws Error if prediction not found or not owned by user
 */
export async function deletePrediction(data: {
  userId: string;
  predictionId: number;
}) {
  // Get prediction first to check ownership and lock status
  const existing = await db.query.predictions.findFirst({
    where: and(
      eq(predictions.id, data.predictionId),
      eq(predictions.userId, data.userId) // ✅ REQUIRED - User filter
    ),
    with: {
      match: true,
    },
  });

  if (!existing) {
    throw new Error('Prediction not found or access denied');
  }

  // Check if prediction is locked
  if (existing.isLocked) {
    throw new Error('Cannot delete a locked prediction');
  }

  // Check if match has started
  if (existing.match.status !== 'scheduled') {
    throw new Error('Cannot delete prediction for a match that has started');
  }

  // Delete prediction
  const [deleted] = await db
    .delete(predictions)
    .where(
      and(
        eq(predictions.id, data.predictionId),
        eq(predictions.userId, data.userId) // ✅ REQUIRED - User filter
      )
    )
    .returning();

  return deleted;
}
