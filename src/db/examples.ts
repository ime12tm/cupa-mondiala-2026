/**
 * Database Query Examples
 *
 * This file demonstrates how to use the database query functions.
 * These are examples only - adapt them for your actual API routes and components.
 */

import {
  upsertPrediction,
  getUserPredictions,
  getMatchesWithUserPredictions,
  getUpcomingMatches,
  getLeaderboard,
  getUserStats,
  getMatchById,
  updateMatchResult,
  calculatePointsForMatch,
  lockPredictionsForMatch,
} from "./queries";

// Example 1: User makes a prediction
async function exampleMakePrediction() {
  const userId = "user_123"; // From Clerk
  const matchId = 1;
  const homeScore = 2;
  const awayScore = 1;

  try {
    const prediction = await upsertPrediction(
      userId,
      matchId,
      homeScore,
      awayScore
    );
    console.log("Prediction created:", prediction);
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error:", error.message);
      // Handle specific errors:
      // - "Match not found"
      // - "Cannot predict for a match that has started or finished"
      // - "Prediction is locked and cannot be modified"
    }
  }
}

// Example 2: Get all user's predictions
async function exampleGetUserPredictions() {
  const userId = "user_123";

  const predictions = await getUserPredictions(userId);

  // predictions is an array with match details included
  predictions.forEach((p) => {
    console.log(`
      Match: ${p.match.homeTeam?.name} vs ${p.match.awayTeam?.name}
      Prediction: ${p.homeScore}-${p.awayScore}
      Points: ${p.pointsEarned ?? "TBD"}
      Locked: ${p.isLocked}
    `);
  });
}

// Example 3: Get matches with user's predictions for a stage
async function exampleGetMatchesForStage() {
  const userId = "user_123";
  const stageSlug = "group_stage"; // or "round_of_16", "quarter_finals", etc.

  const matches = await getMatchesWithUserPredictions(userId, stageSlug);

  matches.forEach((match) => {
    const homeTeamName = match.homeTeam?.name || match.homeTeamPlaceholder;
    const awayTeamName = match.awayTeam?.name || match.awayTeamPlaceholder;

    console.log(`
      Match ${match.matchNumber}: ${homeTeamName} vs ${awayTeamName}
      Venue: ${match.venue.name}, ${match.venue.city}
      Scheduled: ${match.scheduledAt}
      User Prediction: ${
        match.userPrediction
          ? `${match.userPrediction.homeScore}-${match.userPrediction.awayScore}`
          : "None"
      }
    `);
  });
}

// Example 4: Get upcoming matches
async function exampleGetUpcomingMatches() {
  const matches = await getUpcomingMatches(10);

  console.log(`Next ${matches.length} matches:`);
  matches.forEach((match) => {
    const homeTeamName = match.homeTeam?.name || match.homeTeamPlaceholder;
    const awayTeamName = match.awayTeam?.name || match.awayTeamPlaceholder;

    console.log(`
      ${homeTeamName} vs ${awayTeamName}
      at ${match.venue.name}
      on ${match.scheduledAt}
    `);
  });
}

// Example 5: Get leaderboard
async function exampleGetLeaderboard() {
  const topUsers = await getLeaderboard(10);

  console.log("Top 10 Users:");
  topUsers.forEach((user, index) => {
    console.log(`${index + 1}. ${user.displayName} - ${user.totalPoints} pts`);
  });
}

// Example 6: Get user statistics
async function exampleGetUserStats() {
  const userId = "user_123";

  const stats = await getUserStats(userId);

  console.log(`
    User: ${stats.user.displayName}
    Total Points: ${stats.totalPoints}
    Total Predictions: ${stats.totalPredictions}
    Completed Predictions: ${stats.completedPredictions}
    Exact Scores: ${stats.exactScores}
    Correct Results: ${stats.correctResults}
  `);
}

// Example 7: Admin - Update match result and calculate points
async function exampleUpdateMatchResult() {
  const matchId = 1;
  const homeScore = 2;
  const awayScore = 1;

  try {
    // First, lock predictions if not already locked
    await lockPredictionsForMatch(matchId);

    // Update the match result
    const updatedMatch = await updateMatchResult(
      matchId,
      homeScore,
      awayScore,
      "finished"
    );
    console.log("Match updated:", updatedMatch);

    // Calculate points for all predictions
    const predictionsUpdated = await calculatePointsForMatch(matchId);
    console.log(`Points calculated for ${predictionsUpdated} predictions`);
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error:", error.message);
    }
  }
}

// Example 8: Get match by ID with full details
async function exampleGetMatch() {
  const matchId = 1;

  const match = await getMatchById(matchId);

  if (!match) {
    console.log("Match not found");
    return;
  }

  const homeTeamName = match.homeTeam?.name || match.homeTeamPlaceholder;
  const awayTeamName = match.awayTeam?.name || match.awayTeamPlaceholder;

  console.log(`
    Match ${match.matchNumber}: ${homeTeamName} vs ${awayTeamName}
    Stage: ${match.stage.name}
    Venue: ${match.venue.name}, ${match.venue.city}
    Scheduled: ${match.scheduledAt}
    Status: ${match.status}
    ${
      match.homeScore !== null && match.awayScore !== null
        ? `Score: ${match.homeScore}-${match.awayScore}`
        : ""
    }
  `);
}

// Example 9: TypeScript usage with relations
import { db } from "./index";
import { matches } from "./schema";
import { eq } from "drizzle-orm";

async function exampleTypeScriptRelations() {
  // Query with relations is fully type-safe
  const match = await db.query.matches.findFirst({
    where: eq(matches.id, 1),
    with: {
      homeTeam: true,
      awayTeam: true,
      venue: true,
      stage: true,
      predictions: {
        with: {
          user: true,
        },
      },
    },
  });

  if (match) {
    // TypeScript knows the shape of the data
    console.log(match.homeTeam?.name); // Type: string | undefined
    console.log(match.venue.city); // Type: string
    console.log(match.stage.name); // Type: string

    // Access nested predictions
    match.predictions.forEach((prediction) => {
      console.log(`${prediction.user.displayName}: ${prediction.homeScore}-${prediction.awayScore}`);
    });
  }
}

// Example 10: Raw SQL query (when needed)
import { sql } from "drizzle-orm";

async function exampleRawQuery() {
  // For complex queries not supported by the query builder
  const result = await db.execute(sql`
    SELECT
      u.display_name,
      COUNT(p.id) as prediction_count,
      SUM(p.points_earned) as total_points
    FROM users u
    LEFT JOIN predictions p ON u.id = p.user_id
    WHERE p.points_earned IS NOT NULL
    GROUP BY u.id, u.display_name
    ORDER BY total_points DESC
    LIMIT 10
  `);

  console.log("Custom leaderboard:", result.rows);
}

/**
 * API Route Example: GET /api/matches
 */
export async function GET_api_matches(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId"); // From auth
  const stage = searchParams.get("stage"); // Optional filter

  try {
    const matches = await getMatchesWithUserPredictions(
      userId || undefined,
      stage || undefined
    );

    return Response.json({ success: true, data: matches });
  } catch (error) {
    console.error("Error fetching matches:", error);
    return Response.json(
      { success: false, error: "Failed to fetch matches" },
      { status: 500 }
    );
  }
}

/**
 * API Route Example: POST /api/predictions
 */
export async function POST_api_predictions(request: Request) {
  try {
    const { userId, matchId, homeScore, awayScore } = await request.json();

    // Validate input
    if (!userId || !matchId || homeScore === undefined || awayScore === undefined) {
      return Response.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (homeScore < 0 || awayScore < 0) {
      return Response.json(
        { success: false, error: "Scores must be non-negative" },
        { status: 400 }
      );
    }

    const prediction = await upsertPrediction(
      userId,
      matchId,
      homeScore,
      awayScore
    );

    return Response.json({ success: true, data: prediction });
  } catch (error) {
    if (error instanceof Error) {
      return Response.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return Response.json(
      { success: false, error: "Failed to save prediction" },
      { status: 500 }
    );
  }
}

/**
 * API Route Example: GET /api/leaderboard
 */
export async function GET_api_leaderboard(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "100");

  try {
    const leaderboard = await getLeaderboard(limit);
    return Response.json({ success: true, data: leaderboard });
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return Response.json(
      { success: false, error: "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}
