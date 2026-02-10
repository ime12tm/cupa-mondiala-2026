import "dotenv/config";
import { db } from "./index";
import { teams } from "./schema";
import { eq } from "drizzle-orm";

async function updateTeamCodes() {
  console.log("🔄 Updating team codes...");

  const teamUpdates = [
    // Group C
    { name: "Brazil", code: "BRA" },
    { name: "Morocco", code: "MAR" },
    { name: "Haiti", code: "HAI" },
    { name: "Scotland", code: "SCO" },
    // Group E
    { name: "Germany", code: "GER" },
    { name: "Curaçao", code: "CUW" },
    { name: "Ivory Coast", code: "CIV" },
    { name: "Ecuador", code: "ECU" },
    // Group G
    { name: "Belgium", code: "BEL" },
    { name: "Egypt", code: "EGY" },
    { name: "Iran", code: "IRN" },
    { name: "New Zealand", code: "NZL" },
    // Group H
    { name: "Spain", code: "ESP" },
    { name: "Cape Verde", code: "CPV" },
    { name: "Saudi Arabia", code: "KSA" },
    { name: "Uruguay", code: "URU" },
    // Group J
    { name: "Argentina", code: "ARG" },
    { name: "Algeria", code: "ALG" },
    { name: "Austria", code: "AUT" },
    { name: "Jordan", code: "JOR" },
    // Group L
    { name: "England", code: "ENG" },
    { name: "Croatia", code: "CRO" },
    { name: "Ghana", code: "GHA" },
    { name: "Panama", code: "PAN" },
  ];

  let updated = 0;
  for (const { name, code } of teamUpdates) {
    try {
      await db
        .update(teams)
        .set({ code })
        .where(eq(teams.name, name));
      console.log(`✅ Updated ${name} → ${code}`);
      updated++;
    } catch (error) {
      console.error(`❌ Failed to update ${name}:`, error);
    }
  }

  console.log(`\n✨ Updated ${updated}/${teamUpdates.length} team codes`);
}

updateTeamCodes()
  .catch((error) => {
    console.error("❌ Update failed:", error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
