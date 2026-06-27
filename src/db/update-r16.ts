import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";
import { eq } from "drizzle-orm";
import "dotenv/config";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

type MatchUpdate = {
  matchNumber: number;
  homeTeamPlaceholder: string;
  awayTeamPlaceholder: string;
  venueCity: string;
  scheduledAt: Date;
};

const updates: MatchUpdate[] = [
  { matchNumber: 89, homeTeamPlaceholder: "Winner GER/PAR", awayTeamPlaceholder: "Winner FRA/SWE", venueCity: "Foxborough", scheduledAt: new Date("2026-07-04T17:00:00-04:00") },
  { matchNumber: 90, homeTeamPlaceholder: "Winner RSA/CAN", awayTeamPlaceholder: "Winner NED/MAR", venueCity: "Inglewood", scheduledAt: new Date("2026-07-04T13:00:00-07:00") },
  { matchNumber: 91, homeTeamPlaceholder: "Winner BRA/JPN", awayTeamPlaceholder: "Winner CIV/NOR", venueCity: "Kansas City", scheduledAt: new Date("2026-07-05T16:00:00-05:00") },
  { matchNumber: 92, homeTeamPlaceholder: "Winner Match 79", awayTeamPlaceholder: "Winner Match 80", venueCity: "Atlanta", scheduledAt: new Date("2026-07-05T20:00:00-04:00") },
  { matchNumber: 93, homeTeamPlaceholder: "Winner Match 83", awayTeamPlaceholder: "Winner Match 84", venueCity: "Miami Gardens", scheduledAt: new Date("2026-07-06T15:00:00-04:00") },
  { matchNumber: 94, homeTeamPlaceholder: "Winner USA/BIH", awayTeamPlaceholder: "Winner Match 82", venueCity: "Houston", scheduledAt: new Date("2026-07-06T20:00:00-05:00") },
  { matchNumber: 95, homeTeamPlaceholder: "Winner ARG/CPV", awayTeamPlaceholder: "Winner AUS/EGY", venueCity: "Philadelphia", scheduledAt: new Date("2026-07-07T12:00:00-04:00") },
  { matchNumber: 96, homeTeamPlaceholder: "Winner Match 85", awayTeamPlaceholder: "Winner Match 87", venueCity: "Arlington", scheduledAt: new Date("2026-07-07T16:00:00-05:00") },
];

async function updateR16() {
  console.log("🔄 Fetching venues...");

  const allVenues = await db.select().from(schema.venues);
  const venueIdByCity = new Map(allVenues.map((v) => [v.city, v.id]));

  console.log(`📋 Updating ${updates.length} Round of 16 matches...`);

  for (const u of updates) {
    const venueId = venueIdByCity.get(u.venueCity);

    if (!venueId) {
      console.error(`❌ Venue not found for city: "${u.venueCity}" (match ${u.matchNumber})`);
      continue;
    }

    await db
      .update(schema.matches)
      .set({
        homeTeamId: null,
        awayTeamId: null,
        homeTeamPlaceholder: u.homeTeamPlaceholder,
        awayTeamPlaceholder: u.awayTeamPlaceholder,
        venueId,
        scheduledAt: u.scheduledAt,
      })
      .where(eq(schema.matches.matchNumber, u.matchNumber));

    console.log(`  ✅ Match ${u.matchNumber}: ${u.homeTeamPlaceholder} vs ${u.awayTeamPlaceholder} @ ${u.venueCity}`);
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
