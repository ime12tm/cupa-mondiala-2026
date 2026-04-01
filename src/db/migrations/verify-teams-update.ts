import 'dotenv/config';
import { db } from '../index';
import { teams, venues } from '../schema';
import { eq, inArray } from 'drizzle-orm';

/**
 * Verification script for FIFA 2026 draw team updates
 * Confirms that all 6 placeholder teams were updated correctly
 */
async function verifyTeamsUpdate() {
  console.log('🔍 Verifying team updates from FIFA 2026 draw...\n');

  const expectedTeams = [
    { code: 'CZE', name: 'Czechia', group: 'A', confederation: 'UEFA' },
    { code: 'BIH', name: 'Bosnia-Herzegovina', group: 'B', confederation: 'UEFA' },
    { code: 'TUR', name: 'Turkiye', group: 'D', confederation: 'UEFA' },
    { code: 'SWE', name: 'Sweden', group: 'F', confederation: 'UEFA' },
    { code: 'IRQ', name: 'Iraq', group: 'I', confederation: 'AFC' },
    { code: 'COD', name: 'DR Congo', group: 'K', confederation: 'CAF' },
  ];

  const oldCodes = ['UEFA_PO_D', 'UEFA_PO_A', 'UEFA_PO_C', 'UEFA_PO_B', 'IC_PO_2', 'IC_PO_1'];

  try {
    // Check if old placeholder teams still exist
    console.log('Checking for old placeholder team codes...');
    const oldTeams = await db.select()
      .from(teams)
      .where(inArray(teams.code, oldCodes));

    if (oldTeams.length > 0) {
      console.error('❌ FAILED: Found old placeholder teams that should have been updated:');
      oldTeams.forEach(team => console.error(`   - ${team.code}: ${team.name}`));
      return false;
    }
    console.log('✅ No old placeholder teams found\n');

    // Verify new teams exist with correct data
    console.log('Verifying new teams...');
    let allCorrect = true;

    for (const expected of expectedTeams) {
      const team = await db.select()
        .from(teams)
        .where(eq(teams.code, expected.code))
        .limit(1);

      if (team.length === 0) {
        console.error(`❌ FAILED: Team ${expected.code} not found`);
        allCorrect = false;
        continue;
      }

      const actualTeam = team[0];
      const checks = [
        { field: 'name', expected: expected.name, actual: actualTeam.name },
        { field: 'groupLetter', expected: expected.group, actual: actualTeam.groupLetter },
        { field: 'confederation', expected: expected.confederation, actual: actualTeam.confederation },
      ];

      let teamCorrect = true;
      for (const check of checks) {
        if (check.actual !== check.expected) {
          console.error(`❌ ${expected.code} ${check.field}: expected "${check.expected}", got "${check.actual}"`);
          teamCorrect = false;
          allCorrect = false;
        }
      }

      if (teamCorrect) {
        console.log(`✅ ${expected.code} (${expected.name}) - Group ${expected.group} - ${expected.confederation}`);
      }
    }

    console.log();

    // Verify venue capacity update
    console.log('Verifying venue capacity update...');
    const venue = await db.select()
      .from(venues)
      .where(eq(venues.name, 'Estadio Akron'))
      .limit(1);

    if (venue.length === 0) {
      console.error('❌ FAILED: Estadio Akron not found');
      allCorrect = false;
    } else if (venue[0].capacity !== 49813) {
      console.error(`❌ FAILED: Estadio Akron capacity is ${venue[0].capacity}, expected 49813`);
      allCorrect = false;
    } else {
      console.log(`✅ Estadio Akron capacity: ${venue[0].capacity}`);
    }

    console.log();

    if (allCorrect) {
      console.log('✅ All verifications passed!');
      console.log('🎉 Database successfully updated with FIFA 2026 draw results');
      return true;
    } else {
      console.error('❌ Some verifications failed');
      return false;
    }
  } catch (error) {
    console.error('❌ Verification error:', error);
    return false;
  }
}

// Run verification
verifyTeamsUpdate()
  .then((success) => process.exit(success ? 0 : 1))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
