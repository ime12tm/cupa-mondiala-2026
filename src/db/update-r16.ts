import "dotenv/config";
import { db } from "./index";
import { matches, teams, venues } from "./schema";
import { eq, inArray } from "drizzle-orm";

// One-time script to update Round of 16 matches with confirmed teams, venues, and kickoff times
// Source: https://en.wikipedia.org/wiki/2026_FIFA_World_Cup_knockout_stage
async function updateR16() {
  console.log("🔄 Updating Round of 16 matches...");

  const teamCodes = ["PAR", "FRA", "CAN", "MAR", "BRA", "NOR", "MEX", "ENG", "POR", "ESP", "USA", "BEL", "ARG", "EGY", "SUI", "COL"];
  const foundTeams = await db.select({ id: teams.id, code: teams.code }).from(teams).where(inArray(teams.code, teamCodes));
  const teamIdByCode = new Map(foundTeams.map((t) => [t.code, t.id]));

  const getTeamId = (code: string): number => {
    const id = teamIdByCode.get(code);
    if (!id) throw new Error(`Team not found: ${code}`);
    return id;
  };

  const venueCities = ["Philadelphia", "Houston", "East Rutherford", "Mexico City", "Arlington", "Seattle", "Atlanta", "Vancouver"];
  const foundVenues = await db.select({ id: venues.id, city: venues.city }).from(venues).where(inArray(venues.city, venueCities));
  const venueIdByCity = new Map(foundVenues.map((v) => [v.city, v.id]));

  const getVenueId = (city: string): number => {
    const id = venueIdByCity.get(city);
    if (!id) throw new Error(`Venue not found for city: ${city}`);
    return id;
  };

  const updates = [
    { matchNumber: 89, homeTeamCode: "PAR", awayTeamCode: "FRA", venueCity: "Philadelphia", scheduledAt: new Date("2026-07-04T17:00:00-04:00") },
    { matchNumber: 90, homeTeamCode: "CAN", awayTeamCode: "MAR", venueCity: "Houston", scheduledAt: new Date("2026-07-04T12:00:00-05:00") },
    { matchNumber: 91, homeTeamCode: "BRA", awayTeamCode: "NOR", venueCity: "East Rutherford", scheduledAt: new Date("2026-07-05T16:00:00-04:00") },
    { matchNumber: 92, homeTeamCode: "MEX", awayTeamCode: "ENG", venueCity: "Mexico City", scheduledAt: new Date("2026-07-05T18:00:00-06:00") },
    { matchNumber: 93, homeTeamCode: "POR", awayTeamCode: "ESP", venueCity: "Arlington", scheduledAt: new Date("2026-07-06T14:00:00-05:00") },
    { matchNumber: 94, homeTeamCode: "USA", awayTeamCode: "BEL", venueCity: "Seattle", scheduledAt: new Date("2026-07-06T17:00:00-07:00") },
    { matchNumber: 95, homeTeamCode: "ARG", awayTeamCode: "EGY", venueCity: "Atlanta", scheduledAt: new Date("2026-07-07T12:00:00-04:00") },
    { matchNumber: 96, homeTeamCode: "SUI", awayTeamCode: "COL", venueCity: "Vancouver", scheduledAt: new Date("2026-07-07T13:00:00-07:00") },
  ];

  for (const u of updates) {
    await db
      .update(matches)
      .set({
        homeTeamId: getTeamId(u.homeTeamCode),
        awayTeamId: getTeamId(u.awayTeamCode),
        homeTeamPlaceholder: null,
        awayTeamPlaceholder: null,
        venueId: getVenueId(u.venueCity),
        scheduledAt: u.scheduledAt,
      })
      .where(eq(matches.matchNumber, u.matchNumber));

    console.log(`  ✅ Match ${u.matchNumber}: ${u.homeTeamCode} vs ${u.awayTeamCode} @ ${u.venueCity}`);
  }

  console.log("✨ Round of 16 update completed!");
}

updateR16()
  .catch((error) => {
    console.error("❌ Update failed:", error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
