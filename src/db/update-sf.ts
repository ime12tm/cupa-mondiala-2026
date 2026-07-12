import "dotenv/config";
import { db } from "./index";
import { matches, teams, venues } from "./schema";
import { eq, inArray } from "drizzle-orm";

// One-time script to update Semi-final matches with confirmed teams, venues, and kickoff times
// Source: FIFA / official broadcast schedule
async function updateSF() {
  console.log("🔄 Updating Semi-final matches...");

  const teamCodes = ["FRA", "ESP", "ENG", "ARG"];
  const foundTeams = await db.select({ id: teams.id, code: teams.code }).from(teams).where(inArray(teams.code, teamCodes));
  const teamIdByCode = new Map(foundTeams.map((t) => [t.code, t.id]));

  const getTeamId = (code: string): number => {
    const id = teamIdByCode.get(code);
    if (!id) throw new Error(`Team not found: ${code}`);
    return id;
  };

  const venueCities = ["Arlington", "Atlanta"];
  const foundVenues = await db.select({ id: venues.id, city: venues.city }).from(venues).where(inArray(venues.city, venueCities));
  const venueIdByCity = new Map(foundVenues.map((v) => [v.city, v.id]));

  const getVenueId = (city: string): number => {
    const id = venueIdByCity.get(city);
    if (!id) throw new Error(`Venue not found for city: ${city}`);
    return id;
  };

  const updates = [
    { matchNumber: 101, homeTeamCode: "FRA", awayTeamCode: "ESP", venueCity: "Arlington", scheduledAt: new Date("2026-07-14T14:00:00-05:00") },
    { matchNumber: 102, homeTeamCode: "ENG", awayTeamCode: "ARG", venueCity: "Atlanta", scheduledAt: new Date("2026-07-15T15:00:00-04:00") },
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

  console.log("✨ Semi-final update completed!");
}

updateSF()
  .catch((error) => {
    console.error("❌ Update failed:", error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
