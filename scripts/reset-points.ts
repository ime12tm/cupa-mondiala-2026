import 'dotenv/config';
import { db } from '../src/db/index';
import { users } from '../src/db/schema';
import { sql } from 'drizzle-orm';

async function resetAllPoints() {
  console.log('Resetting all user points to 0...\n');

  // Get current state
  const [before] = await db.select({
    totalUsers: sql<number>`count(*)`,
    usersWithPoints: sql<number>`count(*) filter (where total_points > 0)`,
    totalPoints: sql<number>`sum(total_points)`
  }).from(users);

  console.log('Before reset:');
  console.log('  Total users:', before.totalUsers);
  console.log('  Users with points:', before.usersWithPoints);
  console.log('  Total points across all users:', before.totalPoints || 0);

  // Reset all points
  await db.update(users).set({
    totalPoints: 0,
    updatedAt: new Date()
  });

  // Verify
  const [after] = await db.select({
    totalUsers: sql<number>`count(*)`,
    usersWithPoints: sql<number>`count(*) filter (where total_points > 0)`,
    totalPoints: sql<number>`sum(total_points)`
  }).from(users);

  console.log('\nAfter reset:');
  console.log('  Total users:', after.totalUsers);
  console.log('  Users with points:', after.usersWithPoints);
  console.log('  Total points across all users:', after.totalPoints || 0);

  console.log('\n✓ All user points have been reset to 0');

  process.exit(0);
}

resetAllPoints().catch(console.error);
