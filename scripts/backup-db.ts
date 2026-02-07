import 'dotenv/config';
import { db } from '../src/db/index';
import { sql } from 'drizzle-orm';
import fs from 'fs';

const tables = [
  'users',
  'tournament_stages',
  'teams',
  'venues',
  'matches',
  'predictions',
  'leaderboard_snapshots'
];

async function createBackup() {
  const backup = {
    timestamp: new Date().toISOString(),
    database: 'WorldCup 2026',
    tables: {} as any
  };

  console.log('Starting database backup...\n');

  for (const table of tables) {
    try {
      const result = await db.execute(sql.raw(`SELECT * FROM ${table}`));
      backup.tables[table] = {
        count: result.rows.length,
        data: result.rows
      };
      console.log(`✓ Backed up ${table}: ${result.rows.length} rows`);
    } catch (error: any) {
      console.error(`✗ Error backing up ${table}:`, error.message);
    }
  }

  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `backups/db-backup-${timestamp}.json`;

  if (!fs.existsSync('backups')) {
    fs.mkdirSync('backups');
  }

  fs.writeFileSync(filename, JSON.stringify(backup, null, 2));
  console.log(`\n✓ Backup saved to: ${filename}`);
  console.log(`✓ Total size: ${(fs.statSync(filename).size / 1024).toFixed(2)} KB`);

  process.exit(0);
}

createBackup().catch(console.error);
