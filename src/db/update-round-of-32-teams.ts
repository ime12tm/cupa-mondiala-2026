import "dotenv/config";
import { db } from "./index";
import { matches, teams } from "./schema";
import { eq, inArray } from "drizzle-orm";

// One-time script to update Round of 32 placeholder teams with confirmed qualifiers
// Source: https://en.wikipedia.org/wiki/2026_FIFA_World_Cup_knockout_stage
async function updateRoundOf32Teams() {
  console.log("🔄 Updating Round of 32 team assignments...");

  const teamCodes = ["ECU", "ENG", "COD", "SEN", "POR", "CRO", "AUT", "ALG", "COL", "GHA"];
  const insertedTeams = await db
    .select({ id: teams.id, code: teams.code })
    .from(teams)
    .where(inArray(teams.code, teamCodes));

  const teamIdByCode = new Map<string, number>();
  insertedTeams.forEach((t) => teamIdByCode.set(t.code, t.id));

  const getTeamId = (code: string): number => {
    const id = teamIdByCode.get(code);
    if (!id) throw new Error(`Team not found: ${code}`);
    return id;
  };

  const updates: Array<{
    matchNumber: number;
    homeTeamId?: number;
    awayTeamId?: number;
    homeTeamPlaceholder?: null;
    awayTeamPlaceholder?: null;
  }> = [
    // Match 79: Mexico vs Ecuador (was "Best 3rd C/E")
    { matchNumber: 79, awayTeamId: getTeamId("ECU"), awayTeamPlaceholder: null },
    // Match 80: England vs DR Congo (was "Winner Group L" vs "Best 3rd I/J/K")
    { matchNumber: 80, homeTeamId: getTeamId("ENG"), awayTeamId: getTeamId("COD"), homeTeamPlaceholder: null, awayTeamPlaceholder: null },
    // Match 82: Belgium vs Senegal (was "Best 3rd A/I/J")
    { matchNumber: 82, awayTeamId: getTeamId("SEN"), awayTeamPlaceholder: null },
    // Match 83: Portugal vs Croatia (was "Runner-up Group K" vs "Runner-up Group L")
    { matchNumber: 83, homeTeamId: getTeamId("POR"), awayTeamId: getTeamId("CRO"), homeTeamPlaceholder: null, awayTeamPlaceholder: null },
    // Match 84: Spain vs Austria (was "Runner-up Group J")
    { matchNumber: 84, awayTeamId: getTeamId("AUT"), awayTeamPlaceholder: null },
    // Match 85: Switzerland vs Algeria (was "Best 3rd G/J")
    { matchNumber: 85, awayTeamId: getTeamId("ALG"), awayTeamPlaceholder: null },
    // Match 87: Colombia vs Ghana (was "Winner Group K" vs "Best 3rd E/I/L")
    { matchNumber: 87, homeTeamId: getTeamId("COL"), awayTeamId: getTeamId("GHA"), homeTeamPlaceholder: null, awayTeamPlaceholder: null },
  ];

  for (const update of updates) {
    const { matchNumber, ...fields } = update;
    await db.update(matches).set(fields).where(eq(matches.matchNumber, matchNumber));
    console.log(`✅ Updated match ${matchNumber}`);
  }

  console.log("✅ Round of 32 team assignments updated successfully");
}

updateRoundOf32Teams().catch(console.error);
