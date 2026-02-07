/**
 * Test script for group stage prediction limitation
 * Run with: npx tsx src/db/test-group-stage.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

import {
  getFirstGroupStageMatch,
  hasGroupStageDeadlinePassed,
  getUserGroupStagePredictionCount,
  canUserPredictGroupStage,
} from './queries';
import { db } from './index';
import { matches, tournamentStages } from './schema';
import { eq, sql } from 'drizzle-orm';

async function testGroupStageQueries() {
  console.log('🧪 Testing Group Stage Prediction Limitation\n');

  // Test 1: Verify group stage match count
  console.log('📊 Test 1: Verify group stage match count');
  const groupStageMatches = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(matches)
    .innerJoin(tournamentStages, eq(matches.stageId, tournamentStages.id))
    .where(eq(tournamentStages.slug, 'group_stage'));

  const matchCount = groupStageMatches[0]?.count || 0;
  console.log(`   ✓ Group stage matches: ${matchCount}`);
  console.log(`   ${matchCount === 72 ? '✅' : '❌'} Expected: 72\n`);

  // Test 2: Get first group stage match
  console.log('📊 Test 2: Get first group stage match');
  try {
    const firstMatch = await getFirstGroupStageMatch();
    console.log(`   ✓ Match Number: ${firstMatch.matchNumber}`);
    console.log(`   ✓ Home Team: ${firstMatch.homeTeam?.name || 'TBD'}`);
    console.log(`   ✓ Away Team: ${firstMatch.awayTeam?.name || 'TBD'}`);
    console.log(`   ✓ Scheduled: ${firstMatch.scheduledAt}`);
    console.log(`   ✓ Venue: ${firstMatch.venue.name}, ${firstMatch.venue.city}`);

    const expectedDate = '2026-06-11';
    const matchDate = new Date(firstMatch.scheduledAt).toISOString().split('T')[0];
    console.log(`   ${matchDate === expectedDate ? '✅' : '❌'} Expected date: ${expectedDate}\n`);
  } catch (error) {
    console.log(`   ❌ Error: ${error}\n`);
  }

  // Test 3: Check if deadline has passed
  console.log('📊 Test 3: Check if deadline has passed');
  try {
    const deadlinePassed = await hasGroupStageDeadlinePassed();
    console.log(`   ✓ Deadline passed: ${deadlinePassed}`);
    console.log(`   ${deadlinePassed === false ? '✅' : '⚠️'} Expected: false (tournament is in 2026)\n`);
  } catch (error) {
    console.log(`   ❌ Error: ${error}\n`);
  }

  // Test 4: Test user prediction count (using first user if exists)
  console.log('📊 Test 4: Test user prediction count');
  try {
    const users = await db.query.users.findMany({ limit: 1 });

    if (users.length > 0) {
      const userId = users[0].userId;
      const count = await getUserGroupStagePredictionCount(userId);
      console.log(`   ✓ User: ${users[0].displayName}`);
      console.log(`   ✓ Predictions: ${count.completed}/${count.total}`);
      console.log(`   ✅ Query executed successfully\n`);
    } else {
      console.log(`   ⚠️ No users in database to test\n`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error}\n`);
  }

  // Test 5: Test canUserPredictGroupStage
  console.log('📊 Test 5: Test canUserPredictGroupStage validation');
  try {
    const users = await db.query.users.findMany({ limit: 1 });

    if (users.length > 0) {
      const userId = users[0].userId;
      const validation = await canUserPredictGroupStage(userId);
      console.log(`   ✓ User: ${users[0].displayName}`);
      console.log(`   ✓ Allowed: ${validation.allowed}`);
      console.log(`   ✓ Reason: ${validation.reason || 'N/A'}`);
      console.log(`   ✓ Progress: ${validation.progress.completed}/${validation.progress.total}`);
      console.log(`   ✅ Validation executed successfully\n`);
    } else {
      console.log(`   ⚠️ No users in database to test\n`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error}\n`);
  }

  // Test 6: Check new schema column
  console.log('📊 Test 6: Verify groupStageDeadlinePassed column exists');
  try {
    const users = await db.query.users.findMany({ limit: 3 });
    console.log(`   ✓ Found ${users.length} users`);
    users.forEach(user => {
      console.log(`   - ${user.displayName}: groupStageDeadlinePassed = ${user.groupStageDeadlinePassed}`);
    });
    console.log(`   ✅ Column exists and is readable\n`);
  } catch (error) {
    console.log(`   ❌ Error: ${error}\n`);
  }

  console.log('✅ All tests completed!\n');
  process.exit(0);
}

testGroupStageQueries().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
