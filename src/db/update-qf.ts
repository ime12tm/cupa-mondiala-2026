import "dotenv/config";
import { db } from "./index";
import { matches, teams, venues } from "./schema";
import { eq, inArray } from "drizzle-orm";

// One-time script to update Quarter-final matches with confirmed teams, venues, and kickoff times
// Source: https://en.wikipedia.org/wiki/2026_FIFA_World_Cup_knockout_stage
async function updateQF() {
  console.log("🔄 Updating Quarter-final matches...");

  const teamCodes = ["FRA", "MAR", "ESP", "BEL", "NOR", "ENG", "ARG", "SUI"];
  const foundTeams = await db.select({ id: teams.id, code: teams.code }).from(teams).where(inArray(teams.code, teamCodes));
  const teamIdByCode = new Map(foundTeams.map((t) => [t.code, t.id]));

  const getTeamId = (code: string): number => {
    const id = teamIdByCode.get(code);
    if (!id) throw new Error(`Team not found: ${code}`);
    return id;
  };

  const venueCities = ["Foxborough", "Inglewood", "Miami Gardens", "Kansas City"];
  const foundVenues = await db.select({ id: venues.id, city: venues.city }).from(venues).where(inArray(venues.city, venueCities));
  const venueIdByCity = new Map(foundVenues.map((v) => [v.city, v.id]));

  const getVenueId = (city: string): number => {
    const id = venueIdByCity.get(city);
    if (!id) throw new Error(`Venue not found for city: ${city}`);
    return id;
  };

  const updates = [
    { matchNumber: 97, homeTeamCode: "FRA", awayTeamCode: "MAR", venueCity: "Foxborough", scheduledAt: new Date("2026-07-09T16:00:00-04:00") },
    { matchNumber: 98, homeTeamCode: "ESP", awayTeamCode: "BEL", venueCity: "Inglewood", scheduledAt: new Date("2026-07-10T12:00:00-07:00") },
    { matchNumber: 99, homeTeamCode: "NOR", awayTeamCode: "ENG", venueCity: "Miami Gardens", scheduledAt: new Date("2026-07-11T17:00:00-04:00") },
    { matchNumber: 100, homeTeamCode: "ARG", awayTeamCode: "SUI", venueCity: "Kansas City", scheduledAt: new Date("2026-07-11T20:00:00-05:00") },
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

  console.log("✨ Quarter-final update completed!");
}

updateQF()
  .catch((error) => {
    console.error("❌ Update failed:", error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
