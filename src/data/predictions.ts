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
import { predictions, matches, tournamentStages, users } from '@/db/schema';
import { eq, and, asc, sql, desc } from 'drizzle-orm';

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

/**
 * Count how many group stage predictions a user has made
 * SECURITY: Filtered by userId
 *
 * @param userId - Clerk user ID
 * @returns { completed: number, total: 72 }
 */
export async function getUserGroupStagePredictionCount(userId: string) {
  // Get all group stage match IDs
  const groupStageMatches = await db
    .select({ id: matches.id })
    .from(matches)
    .innerJoin(tournamentStages, eq(matches.stageId, tournamentStages.id))
    .where(eq(tournamentStages.slug, 'group_stage'));

  const total = groupStageMatches.length;

  // Count user's predictions for these matches
  const userPredictions = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(predictions)
    .innerJoin(matches, eq(predictions.matchId, matches.id))
    .innerJoin(tournamentStages, eq(matches.stageId, tournamentStages.id))
    .where(
      and(
        eq(predictions.userId, userId),
        eq(tournamentStages.slug, 'group_stage')
      )
    );

  const completed = userPredictions[0]?.count || 0;

  return { completed, total };
}

/**
 * Check if user can predict group stage matches
 * SECURITY: Filtered by userId, checks user's join date and admin status
 *
 * @param userId - Clerk user ID
 * @returns { allowed: boolean, reason?: string, progress: { completed: number, total: 72 } }
 */
export async function canUserPredictGroupStage(userId: string) {
  // Check if user is admin (admins bypass all restrictions)
  const { isAdmin } = await import('@/lib/auth');
  const adminStatus = await isAdmin();

  if (adminStatus) {
    return {
      allowed: true,
      reason: 'Admin override',
      progress: { completed: 0, total: 72 },
    };
  }

  // Get user record
  const user = await db.query.users.findFirst({
    where: eq(users.userId, userId),
  });

  if (!user) {
    throw new Error('User not found');
  }

  // If user joined after deadline, they're exempt
  if (user.groupStageDeadlinePassed) {
    return {
      allowed: true,
      reason: 'Joined after deadline',
      progress: { completed: 0, total: 72 },
    };
  }

  // Check if deadline has passed
  const { hasGroupStageDeadlinePassed } = await import('@/data/matches');
  const deadlinePassed = await hasGroupStageDeadlinePassed();

  // If deadline hasn't passed yet, allow predictions
  if (!deadlinePassed) {
    const progress = await getUserGroupStagePredictionCount(userId);
    return {
      allowed: true,
      progress,
    };
  }

  // Deadline has passed - check if user completed all predictions
  const progress = await getUserGroupStagePredictionCount(userId);

  if (progress.completed === 72) {
    return {
      allowed: true,
      progress,
    };
  }

  // User didn't complete all predictions before deadline
  return {
    allowed: false,
    reason: `You completed ${progress.completed}/72 group stage predictions before the deadline. Group stage predictions are now locked.`,
    progress,
  };
}

/**
 * Get all matches with user's predictions (if any)
 * SECURITY: If userId provided, filters predictions by userId
 *
 * @param userId - Optional Clerk user ID
 * @param stageSlug - Optional stage filter
 * @returns Matches with userPrediction property (null if no prediction)
 */
export async function getMatchesWithUserPredictions(
  userId?: string | null,
  stageSlug?: string | null
) {
  let whereConditions = undefined;

  if (stageSlug) {
    const stage = await db.query.tournamentStages.findFirst({
      where: eq(tournamentStages.slug, stageSlug),
    });

    if (stage) {
      whereConditions = eq(matches.stageId, stage.id);
    }
  }

  const allMatches = await db.query.matches.findMany({
    where: whereConditions,
    with: {
      homeTeam: true,
      awayTeam: true,
      venue: true,
      stage: true,
    },
    orderBy: [asc(matches.scheduledAt)],
  });

  if (!userId) {
    return allMatches.map((match) => ({
      ...match,
      userPrediction: null,
    }));
  }

  // Get all user predictions for these matches
  const matchIds = allMatches.map((m) => m.id);
  const userPredictions = await db.query.predictions.findMany({
    where: and(
      eq(predictions.userId, userId),
      sql`${predictions.matchId} IN ${matchIds}`
    ),
  });

  // Create a map of matchId to prediction
  const predictionMap = new Map(
    userPredictions.map((p) => [p.matchId, p])
  );

  return allMatches.map((match) => ({
    ...match,
    userPrediction: predictionMap.get(match.id) || null,
  }));
}

/**
 * Get all predictions for matrix display
 * PUBLIC/ADMIN - Returns matches with all predictions organized efficiently
 *
 * @param options - Optional filters for stage and finished matches only
 * @returns { matches, users, predictionLookup }
 */
export async function getPredictionsMatrix(options?: {
  stageId?: number;
  finishedOnly?: boolean;
}) {
  // Build where conditions
  let whereConditions = undefined;

  if (options?.stageId) {
    whereConditions = eq(matches.stageId, options.stageId);
  }

  if (options?.finishedOnly) {
    whereConditions = whereConditions
      ? and(whereConditions, eq(matches.status, 'finished'))
      : eq(matches.status, 'finished');
  }

  // Get all matches with teams, venue, and stage info
  const allMatches = await db.query.matches.findMany({
    where: whereConditions,
    with: {
      homeTeam: true,
      awayTeam: true,
      venue: true,
      stage: true,
    },
    orderBy: [asc(matches.scheduledAt)],
  });

  // Get all users (ordered by total points descending)
  const allUsers = await db.query.users.findMany({
    orderBy: [desc(users.totalPoints)],
  });

  // Get ALL predictions at once
  const allPredictions = await db.query.predictions.findMany();

  // Create efficient lookup: Map<matchId, Map<userId, prediction>>
  const predictionLookup = new Map<number, Map<string, typeof allPredictions[0]>>();

  for (const prediction of allPredictions) {
    if (!predictionLookup.has(prediction.matchId)) {
      predictionLookup.set(prediction.matchId, new Map());
    }
    predictionLookup.get(prediction.matchId)!.set(prediction.userId, prediction);
  }

  return {
    matches: allMatches,
    users: allUsers,
    predictionLookup,
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
 * Helper: Calculate points for a prediction
 * - Exact score: 3 points
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
    return 3;
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

/**
 * Create or update a prediction for a user
 * SECURITY: Requires userId - user can only create/update their own predictions
 *
 * Called from server actions (see docs/data-mutations.md)
 * This is a convenience function that wraps create/update logic
 *
 * @param userId - Clerk user ID
 * @param matchId - Match ID
 * @param homeScore - Predicted home score
 * @param awayScore - Predicted away score
 * @returns Created or updated prediction
 * @throws Error if match not found, already started, or prediction is locked
 */
export async function upsertPrediction(
  userId: string,
  matchId: number,
  homeScore: number,
  awayScore: number
) {
  // Check if match exists and is not locked
  const match = await db.query.matches.findFirst({
    where: eq(matches.id, matchId),
  });

  if (!match) {
    throw new Error('Match not found');
  }

  if (match.status !== 'scheduled') {
    throw new Error('Cannot predict for a match that has started or finished');
  }

  // Check if prediction exists and is not locked
  const existingPrediction = await db.query.predictions.findFirst({
    where: and(
      eq(predictions.userId, userId),
      eq(predictions.matchId, matchId)
    ),
  });

  if (existingPrediction?.isLocked) {
    throw new Error('Prediction is locked and cannot be modified');
  }

  const result = calculateResult(homeScore, awayScore);

  if (existingPrediction) {
    // Update existing prediction
    return updatePrediction({
      userId,
      predictionId: existingPrediction.id,
      homeScore,
      awayScore,
    });
  } else {
    // Create new prediction
    return createPrediction({
      userId,
      matchId,
      homeScore,
      awayScore,
    });
  }
}
