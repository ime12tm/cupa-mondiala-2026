import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";
import { eq } from "drizzle-orm";
import "dotenv/config";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

type MatchUpdate = {
  matchNumber: number;
  homeTeamCode?: string;
  awayTeamCode?: string;
  homeTeamPlaceholder?: string | null;
  awayTeamPlaceholder?: string | null;
  venueCity: string;
  scheduledAt: Date;
};

const updates: MatchUpdate[] = [
  { matchNumber: 73, homeTeamCode: "RSA", awayTeamCode: "CAN", venueCity: "Inglewood", scheduledAt: new Date("2026-06-28T12:00:00-07:00") },
  { matchNumber: 74, homeTeamCode: "GER", awayTeamCode: "PAR", venueCity: "Foxborough", scheduledAt: new Date("2026-06-29T16:30:00-04:00") },
  { matchNumber: 75, homeTeamCode: "NED", awayTeamCode: "MAR", venueCity: "Monterrey", scheduledAt: new Date("2026-06-29T19:00:00-06:00") },
  { matchNumber: 76, homeTeamCode: "BRA", awayTeamCode: "JPN", venueCity: "Houston", scheduledAt: new Date("2026-06-29T12:00:00-05:00") },
  { matchNumber: 77, homeTeamCode: "FRA", awayTeamCode: "SWE", venueCity: "East Rutherford", scheduledAt: new Date("2026-06-30T17:00:00-04:00") },
  { matchNumber: 78, homeTeamCode: "CIV", awayTeamCode: "NOR", venueCity: "Arlington", scheduledAt: new Date("2026-06-30T12:00:00-05:00") },
  { matchNumber: 79, homeTeamCode: "MEX", awayTeamPlaceholder: "Best 3rd (C/E)", venueCity: "Mexico City", scheduledAt: new Date("2026-06-30T19:00:00-06:00") },
  { matchNumber: 80, homeTeamPlaceholder: "Winner Group L", awayTeamPlaceholder: "Best 3rd (I/J/K)", venueCity: "Atlanta", scheduledAt: new Date("2026-06-30T12:00:00-04:00") },
  { matchNumber: 81, homeTeamCode: "USA", awayTeamCode: "BIH", venueCity: "Santa Clara", scheduledAt: new Date("2026-07-01T17:00:00-07:00") },
  { matchNumber: 82, homeTeamCode: "BEL", awayTeamPlaceholder: "Best 3rd (A/I/J)", venueCity: "Seattle", scheduledAt: new Date("2026-07-01T13:00:00-07:00") },
  { matchNumber: 83, homeTeamPlaceholder: "Runner-up Group K", awayTeamPlaceholder: "Runner-up Group L", venueCity: "Toronto", scheduledAt: new Date("2026-07-02T19:00:00-04:00") },
  { matchNumber: 84, homeTeamCode: "ESP", awayTeamPlaceholder: "Runner-up Group J", venueCity: "Inglewood", scheduledAt: new Date("2026-07-02T12:00:00-07:00") },
  { matchNumber: 85, homeTeamCode: "SUI", awayTeamPlaceholder: "Best 3rd (G/J)", venueCity: "Vancouver", scheduledAt: new Date("2026-07-02T20:00:00-07:00") },
  { matchNumber: 86, homeTeamCode: "ARG", awayTeamCode: "CPV", venueCity: "Miami Gardens", scheduledAt: new Date("2026-07-03T18:00:00-04:00") },
  { matchNumber: 87, homeTeamPlaceholder: "Winner Group K", awayTeamPlaceholder: "Best 3rd (E/I/L)", venueCity: "Kansas City", scheduledAt: new Date("2026-07-03T20:30:00-05:00") },
  { matchNumber: 88, homeTeamCode: "AUS", awayTeamCode: "EGY", venueCity: "Arlington", scheduledAt: new Date("2026-07-03T13:00:00-05:00") },
];

async function updateR32() {
  console.log("🔄 Fetching teams and venues...");

  const allTeams = await db.select().from(schema.teams);
  const teamIdByCode = new Map(allTeams.map((t) => [t.code, t.id]));

  const allVenues = await db.select().from(schema.venues);
  const venueIdByCity = new Map(allVenues.map((v) => [v.city, v.id]));

  console.log(`📋 Updating ${updates.length} Round of 32 matches...`);

  for (const u of updates) {
    const homeTeamId = u.homeTeamCode ? teamIdByCode.get(u.homeTeamCode) ?? null : null;
    const awayTeamId = u.awayTeamCode ? teamIdByCode.get(u.awayTeamCode) ?? null : null;
    const venueId = venueIdByCity.get(u.venueCity);

    if (!venueId) {
      console.error(`❌ Venue not found for city: "${u.venueCity}" (match ${u.matchNumber})`);
      continue;
    }

    if (u.homeTeamCode && !homeTeamId) {
      console.error(`❌ Team not found for code: "${u.homeTeamCode}" (match ${u.matchNumber})`);
      continue;
    }

    if (u.awayTeamCode && !awayTeamId) {
      console.error(`❌ Team not found for code: "${u.awayTeamCode}" (match ${u.matchNumber})`);
      continue;
    }

    await db
      .update(schema.matches)
      .set({
        homeTeamId: homeTeamId ?? null,
        awayTeamId: awayTeamId ?? null,
        homeTeamPlaceholder: u.homeTeamCode ? null : (u.homeTeamPlaceholder ?? null),
        awayTeamPlaceholder: u.awayTeamCode ? null : (u.awayTeamPlaceholder ?? null),
        venueId,
        scheduledAt: u.scheduledAt,
      })
      .where(eq(schema.matches.matchNumber, u.matchNumber));

    const home = u.homeTeamCode ?? u.homeTeamPlaceholder;
    const away = u.awayTeamCode ?? u.awayTeamPlaceholder;
    console.log(`  ✅ Match ${u.matchNumber}: ${home} vs ${away} @ ${u.venueCity}`);
  }

  console.log("✨ Round of 32 update completed!");
}

updateR32()
  .catch((error) => {
    console.error("❌ Update failed:", error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
