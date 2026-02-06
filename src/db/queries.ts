import { db } from "./index";
import {
  matches,
  predictions,
  users,
  teams,
  venues,
  tournamentStages,
  type NewPrediction,
  type Prediction,
} from "./schema";
import { eq, and, sql, desc, asc, isNull } from "drizzle-orm";

/**
 * Lock all predictions for a specific match
 * Called when a match starts (kickoff)
 */
export async function lockPredictionsForMatch(matchId: number) {
  const result = await db
    .update(predictions)
    .set({ isLocked: true, updatedAt: new Date() })
    .where(eq(predictions.matchId, matchId));

  return result;
}

/**
 * Lock all predictions for matches that are about to start
 * Can be called by a cron job
 */
export async function lockUpcomingMatchPredictions() {
  const now = new Date();

  // Find matches that are scheduled to start within the next 15 minutes
  const upcomingMatches = await db
    .select({ id: matches.id })
    .from(matches)
    .where(
      and(
        eq(matches.status, "scheduled"),
        sql`${matches.scheduledAt} <= ${new Date(
          now.getTime() + 15 * 60 * 1000
        )}`
      )
    );

  // Lock predictions for these matches
  for (const match of upcomingMatches) {
    await lockPredictionsForMatch(match.id);
  }

  return upcomingMatches.length;
}

/**
 * Calculate result code from scores
 */
function calculateResult(
  homeScore: number,
  awayScore: number
): "1" | "X" | "2" {
  if (homeScore > awayScore) return "1";
  if (homeScore === awayScore) return "X";
  return "2";
}

/**
 * Calculate points for a prediction
 * - Exact score: 3 points
 * - Correct result (1/X/2): 1 point
 * - Wrong: 0 points
 * Multiplied by stage multiplier
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
 * Calculate points for all predictions of a finished match
 * Updates predictions table with points earned
 * Updates users table with total points
 */
export async function calculatePointsForMatch(matchId: number) {
  // Get match details with stage
  const match = await db.query.matches.findFirst({
    where: eq(matches.id, matchId),
    with: {
      stage: true,
    },
  });

  if (!match || match.status !== "finished") {
    throw new Error("Match is not finished or does not exist");
  }

  if (match.homeScore === null || match.awayScore === null) {
    throw new Error("Match scores are not set");
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

    // Update user's total points
    await db
      .update(users)
      .set({
        totalPoints: sql`${users.totalPoints} + ${points}`,
        updatedAt: new Date(),
      })
      .where(eq(users.userId, prediction.userId));
  }

  return matchPredictions.length;
}

/**
 * Create or update a prediction for a user and match
 * Validates that the match is not locked
 */
export async function upsertPrediction(
  userId: string,
  matchId: number,
  homeScore: number,
  awayScore: number
): Promise<Prediction> {
  // Check if match exists and is not locked
  const match = await db.query.matches.findFirst({
    where: eq(matches.id, matchId),
  });

  if (!match) {
    throw new Error("Match not found");
  }

  if (match.status !== "scheduled") {
    throw new Error("Cannot predict for a match that has started or finished");
  }

  // Check if prediction exists and is not locked
  const existingPrediction = await db.query.predictions.findFirst({
    where: and(
      eq(predictions.userId, userId),
      eq(predictions.matchId, matchId)
    ),
  });

  if (existingPrediction?.isLocked) {
    throw new Error("Prediction is locked and cannot be modified");
  }

  const result = calculateResult(homeScore, awayScore);
  const predictionData: NewPrediction = {
    userId,
    matchId,
    homeScore,
    awayScore,
    result,
    isLocked: false,
    pointsEarned: null,
  };

  if (existingPrediction) {
    // Update existing prediction
    const [updated] = await db
      .update(predictions)
      .set({
        ...predictionData,
        updatedAt: new Date(),
      })
      .where(eq(predictions.id, existingPrediction.id))
      .returning();

    return updated;
  } else {
    // Insert new prediction
    const [inserted] = await db
      .insert(predictions)
      .values(predictionData)
      .returning();

    return inserted;
  }
}

/**
 * Get all predictions for a user with match details
 */
export async function getUserPredictions(userId: string) {
  const userPredictions = await db.query.predictions.findMany({
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

  return userPredictions;
}

/**
 * Get all matches with user's predictions (if any)
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
 * Get upcoming matches (scheduled in the future)
 */
export async function getUpcomingMatches(limit: number = 10) {
  const now = new Date();

  return await db.query.matches.findMany({
    where: and(eq(matches.status, "scheduled"), sql`${matches.scheduledAt} > ${now}`),
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
 * Get global leaderboard
 */
export async function getLeaderboard(limit: number = 100) {
  return await db.query.users.findMany({
    orderBy: [desc(users.totalPoints)],
    limit,
  });
}

/**
 * Get user statistics
 */
export async function getUserStats(userId: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.userId, userId),
  });

  if (!user) {
    throw new Error("User not found");
  }

  // Get all user predictions
  const userPredictions = await db.query.predictions.findMany({
    where: eq(predictions.userId, userId),
  });

  // Calculate stats
  const totalPredictions = userPredictions.length;
  const completedPredictions = userPredictions.filter(
    (p) => p.pointsEarned !== null
  );
  const exactScores = completedPredictions.filter(
    (p) => p.pointsEarned! >= 3
  ).length;
  const correctResults = completedPredictions.filter(
    (p) => p.pointsEarned! >= 1
  ).length;

  return {
    user,
    totalPredictions,
    completedPredictions: completedPredictions.length,
    exactScores,
    correctResults,
    totalPoints: user.totalPoints,
  };
}

/**
 * Create or update a user from Clerk webhook
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
    [clerkData.firstName, clerkData.lastName].filter(Boolean).join(" ") ||
    clerkData.email.split("@")[0];

  const [user] = await db
    .insert(users)
    .values({
      userId: clerkData.id,
      email: clerkData.email,
      username: clerkData.username || null,
      displayName,
      totalPoints: 0,
    })
    .onConflictDoUpdate({
      target: users.userId,
      set: {
        email: clerkData.email,
        username: clerkData.username || null,
        displayName,
        updatedAt: new Date(),
      },
    })
    .returning();

  return user;
}

/**
 * Ensure user exists in database (lazy sync pattern)
 * Fetches user data from Clerk and creates/updates database record
 * Call this before any database operation that requires userId
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
  // Import clerkClient dynamically to avoid circular dependency
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

/**
 * Get match by ID with full details and optional user prediction
 */
export async function getMatchById(matchId: number, userId?: string) {
  const match = await db.query.matches.findFirst({
    where: eq(matches.id, matchId),
    with: {
      homeTeam: true,
      awayTeam: true,
      venue: true,
      stage: true,
    },
  });

  if (!match) {
    return null;
  }

  if (!userId) {
    return {
      ...match,
      userPrediction: null,
    };
  }

  // Get user's prediction for this match
  const userPrediction = await db.query.predictions.findFirst({
    where: and(
      eq(predictions.userId, userId),
      eq(predictions.matchId, matchId)
    ),
  });

  return {
    ...match,
    userPrediction: userPrediction || null,
  };
}

/**
 * Update match status and scores
 */
export async function updateMatchResult(
  matchId: number,
  homeScore: number,
  awayScore: number,
  status: "live" | "finished" = "finished"
) {
  const [updated] = await db
    .update(matches)
    .set({
      homeScore,
      awayScore,
      status,
    })
    .where(eq(matches.id, matchId))
    .returning();

  return updated;
}
