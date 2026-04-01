import 'dotenv/config';
import { db } from '../index';
import { teams, venues } from '../schema';
import { eq } from 'drizzle-orm';

/**
 * Migration: Update placeholder teams with official FIFA World Cup 2026 draw results
 *
 * This migration updates 6 placeholder teams that were qualified through playoffs:
 * - UEFA Playoff Winners (4 teams): Czechia, Bosnia-Herzegovina, Turkiye, Sweden
 * - Intercontinental Playoff Winners (2 teams): Iraq, DR Congo
 *
 * Also updates Estadio Akron capacity to official tournament capacity.
 *
 * SAFE: This migration only updates team metadata. All match references remain valid
 * because they use database IDs, not team codes. User predictions are preserved.
 */
async function updateTeamsFromDraw() {
  console.log('🔄 Starting migration: Update teams from FIFA 2026 draw...\n');

  try {
    // Update UEFA Playoff Winner D → Czechia (Group A)
    console.log('Updating UEFA_PO_D → Czechia (CZE)...');
    await db.update(teams)
      .set({
        name: 'Czechia',
        code: 'CZE',
        confederation: 'UEFA',
        fifaRanking: 36,
        flagUrl: 'https://flagcdn.com/w320/cz.png'
      })
      .where(eq(teams.code, 'UEFA_PO_D'));

    // Update UEFA Playoff Winner A → Bosnia-Herzegovina (Group B)
    console.log('Updating UEFA_PO_A → Bosnia-Herzegovina (BIH)...');
    await db.update(teams)
      .set({
        name: 'Bosnia-Herzegovina',
        code: 'BIH',
        confederation: 'UEFA',
        fifaRanking: 65,
        flagUrl: 'https://flagcdn.com/w320/ba.png'
      })
      .where(eq(teams.code, 'UEFA_PO_A'));

    // Update UEFA Playoff Winner C → Turkiye (Group D)
    console.log('Updating UEFA_PO_C → Turkiye (TUR)...');
    await db.update(teams)
      .set({
        name: 'Turkiye',
        code: 'TUR',
        confederation: 'UEFA',
        fifaRanking: 42,
        flagUrl: 'https://flagcdn.com/w320/tr.png'
      })
      .where(eq(teams.code, 'UEFA_PO_C'));

    // Update UEFA Playoff Winner B → Sweden (Group F)
    console.log('Updating UEFA_PO_B → Sweden (SWE)...');
    await db.update(teams)
      .set({
        name: 'Sweden',
        code: 'SWE',
        confederation: 'UEFA',
        fifaRanking: 19,
        flagUrl: 'https://flagcdn.com/w320/se.png'
      })
      .where(eq(teams.code, 'UEFA_PO_B'));

    // Update Intercontinental Playoff Winner 2 → Iraq (Group I)
    console.log('Updating IC_PO_2 → Iraq (IRQ)...');
    await db.update(teams)
      .set({
        name: 'Iraq',
        code: 'IRQ',
        confederation: 'AFC',
        fifaRanking: 70,
        flagUrl: 'https://flagcdn.com/w320/iq.png'
      })
      .where(eq(teams.code, 'IC_PO_2'));

    // Update Intercontinental Playoff Winner 1 → DR Congo (Group K)
    console.log('Updating IC_PO_1 → DR Congo (COD)...');
    await db.update(teams)
      .set({
        name: 'DR Congo',
        code: 'COD',
        confederation: 'CAF',
        fifaRanking: 55,
        flagUrl: 'https://flagcdn.com/w320/cd.png'
      })
      .where(eq(teams.code, 'IC_PO_1'));

    // Update Estadio Akron capacity to official tournament capacity
    console.log('Updating Estadio Akron capacity...');
    await db.update(venues)
      .set({ capacity: 49813 })
      .where(eq(venues.name, 'Estadio Akron'));

    console.log('\n✅ Migration completed successfully!');
    console.log('📊 Summary:');
    console.log('   - Updated 6 teams with official draw results');
    console.log('   - Updated 1 venue capacity');
    console.log('   - All match references preserved');
    console.log('   - All user predictions preserved');
    console.log('\n🎉 Database now reflects official FIFA World Cup 2026 teams!');
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  }
}

// Export for programmatic use
export { updateTeamsFromDraw };

// Run if called directly
if (require.main === module) {
  updateTeamsFromDraw()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}
