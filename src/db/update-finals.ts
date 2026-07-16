import "dotenv/config";
import { db } from "./index";
import { matches, teams, venues } from "./schema";
import { eq, inArray } from "drizzle-orm";

// One-time script to update Third-place and Final matches with confirmed teams
// Source: FIFA / official broadcast schedule
async function updateFinals() {
  console.log("🔄 Updating Third-place and Final matches...");

  const teamCodes = ["FRA", "ENG", "ESP", "ARG"];
  const foundTeams = await db.select({ id: teams.id, code: teams.code }).from(teams).where(inArray(teams.code, teamCodes));
  const teamIdByCode = new Map(foundTeams.map((t) => [t.code, t.id]));

  const getTeamId = (code: string): number => {
    const id = teamIdByCode.get(code);
    if (!id) throw new Error(`Team not found: ${code}`);
    return id;
  };

  const venueCities = ["Miami Gardens", "East Rutherford"];
  const foundVenues = await db.select({ id: venues.id, city: venues.city }).from(venues).where(inArray(venues.city, venueCities));
  const venueIdByCity = new Map(foundVenues.map((v) => [v.city, v.id]));

  const getVenueId = (city: string): number => {
    const id = venueIdByCity.get(city);
    if (!id) throw new Error(`Venue not found for city: ${city}`);
    return id;
  };

  const updates = [
    { matchNumber: 103, homeTeamCode: "FRA", awayTeamCode: "ENG", venueCity: "Miami Gardens", scheduledAt: new Date("2026-07-18T17:00:00-04:00") },
    { matchNumber: 104, homeTeamCode: "ESP", awayTeamCode: "ARG", venueCity: "East Rutherford", scheduledAt: new Date("2026-07-19T15:00:00-04:00") },
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

  console.log("✨ Finals update completed!");
}

updateFinals()
  .catch((error) => {
    console.error("❌ Update failed:", error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
