import { NextResponse } from "next/server";
import { db } from "@/db";
import { teams, venues, tournamentStages, matches } from "@/db/schema";
import { getUpcomingMatches, getLeaderboard } from "@/db/queries";

export async function GET() {
  try {
    // Test basic queries
    const allTeams = await db.query.teams.findMany();
    const allVenues = await db.query.venues.findMany();
    const allStages = await db.query.tournamentStages.findMany();

    // Test query helpers
    const upcomingMatches = await getUpcomingMatches(5);
    const leaderboard = await getLeaderboard(10);

    return NextResponse.json({
      success: true,
      data: {
        teams: {
          count: allTeams.length,
          sample: allTeams.slice(0, 3),
        },
        venues: {
          count: allVenues.length,
          sample: allVenues.slice(0, 3),
        },
        stages: {
          count: allStages.length,
          all: allStages,
        },
        upcomingMatches: {
          count: upcomingMatches.length,
          matches: upcomingMatches,
        },
        leaderboard: {
          count: leaderboard.length,
          users: leaderboard,
        },
      },
    });
  } catch (error) {
    console.error("Database test error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
