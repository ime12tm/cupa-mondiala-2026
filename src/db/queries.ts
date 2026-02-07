import { db } from "./index";
import {
  matches,
  predictions,
  users,
  teams,
  venues,
  tournamentStages,
  leaderboardSnapshots,
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
      user: true,
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
 * Get all predictions for matrix display
 * Returns matches with all predictions organized efficiently
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

/**
 * Get all users sorted by display name
 */
export async function getAllUsers() {
  return await db.query.users.findMany({
    orderBy: [asc(users.displayName)],
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

/**
 * Admin-only: Update a prediction by ID
 * Updates the prediction and recalculates user's total points if pointsEarned changes
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
    throw new Error("Prediction not found");
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
 * Admin-only: Delete a prediction by ID
 * Removes the points from user's total if prediction had points
 */
export async function adminDeletePrediction(predictionId: number) {
  // Get the prediction to check if it has points
  const prediction = await db.query.predictions.findFirst({
    where: eq(predictions.id, predictionId),
  });

  if (!prediction) {
    throw new Error("Prediction not found");
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
 * Admin-only: Delete ALL predictions and reset user points
 * WARNING: This is a destructive operation that cannot be undone
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
      const result = await db
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

/**
 * Admin-only: Get prediction by ID with full details
 */
export async function adminGetPrediction(predictionId: number) {
  return await db.query.predictions.findFirst({
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

/**
 * Get all teams in a specific group
 */
export async function getTeamsByGroup(groupLetter: string) {
  return await db.query.teams.findMany({
    where: eq(teams.groupLetter, groupLetter),
    orderBy: [asc(teams.name)],
  });
}

/**
 * Get all group stage matches with full details
 */
export async function getGroupStageMatches() {
  const groupStage = await db.query.tournamentStages.findFirst({
    where: eq(tournamentStages.slug, "group_stage"),
  });

  if (!groupStage) {
    return [];
  }

  return await db.query.matches.findMany({
    where: eq(matches.stageId, groupStage.id),
    with: {
      homeTeam: true,
      awayTeam: true,
      venue: true,
      stage: true,
    },
  });
}

/**
 * Calculate standings for a specific group
 * Returns teams sorted by Points DESC, Goal Difference DESC, Goals For DESC
 */
export async function getGroupStandings(groupLetter: string) {
  // Get all teams in the group
  const groupTeams = await getTeamsByGroup(groupLetter);

  // Get all finished matches for this group
  const groupStage = await db.query.tournamentStages.findFirst({
    where: eq(tournamentStages.slug, "group_stage"),
  });

  if (!groupStage) {
    return [];
  }

  const teamIds = groupTeams.map((t) => t.id);

  const groupMatches = await db.query.matches.findMany({
    where: and(
      eq(matches.stageId, groupStage.id),
      eq(matches.status, "finished"),
      sql`(${matches.homeTeamId} IN (${sql.join(teamIds, sql`, `)}) OR ${matches.awayTeamId} IN (${sql.join(teamIds, sql`, `)}))`
    ),
    with: {
      homeTeam: true,
      awayTeam: true,
    },
  });

  // Calculate stats for each team
  const standings = groupTeams.map((team) => {
    let played = 0;
    let won = 0;
    let drawn = 0;
    let lost = 0;
    let goalsFor = 0;
    let goalsAgainst = 0;

    groupMatches.forEach((match) => {
      // Only process if both scores are set
      if (match.homeScore === null || match.awayScore === null) return;

      const isHome = match.homeTeamId === team.id;
      const isAway = match.awayTeamId === team.id;

      if (!isHome && !isAway) return; // Team not in this match

      played++;

      if (isHome) {
        goalsFor += match.homeScore;
        goalsAgainst += match.awayScore;

        if (match.homeScore > match.awayScore) {
          won++;
        } else if (match.homeScore === match.awayScore) {
          drawn++;
        } else {
          lost++;
        }
      } else {
        goalsFor += match.awayScore;
        goalsAgainst += match.homeScore;

        if (match.awayScore > match.homeScore) {
          won++;
        } else if (match.awayScore === match.homeScore) {
          drawn++;
        } else {
          lost++;
        }
      }
    });

    const goalDifference = goalsFor - goalsAgainst;
    const points = won * 3 + drawn * 1;

    return {
      team,
      played,
      won,
      drawn,
      lost,
      goalsFor,
      goalsAgainst,
      goalDifference,
      points,
    };
  });

  // Sort by: Points DESC, Goal Difference DESC, Goals For DESC
  standings.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference)
      return b.goalDifference - a.goalDifference;
    return b.goalsFor - a.goalsFor;
  });

  return standings;
}

/**
 * Get standings for all 12 groups (A-L)
 */
export async function getAllGroupsStandings() {
  const groups = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

  const allStandings = await Promise.all(
    groups.map(async (groupLetter) => ({
      groupLetter,
      standings: await getGroupStandings(groupLetter),
    }))
  );

  return allStandings;
}

