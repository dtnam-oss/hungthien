/**
 * Migration runner — executes SQL migration files against PostgreSQL.
 *
 * WHY NOT prisma migrate:
 * The requirement specifies hand-written SQL migrations with IF NOT EXISTS,
 * no DROP on tables with data, and no auto-sync tools on shared databases.
 * This runner reads .sql files from the migrations/ directory and executes
 * them in order.
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

async function runMigrations() {
  const client = new pg.Client({
    connectionString: DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✓ Connected to PostgreSQL');

    // Create migrations tracking table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "_migrations" (
        "id" SERIAL PRIMARY KEY,
        "name" VARCHAR(255) NOT NULL UNIQUE,
        "executedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Get already-executed migrations
    const { rows: executed } = await client.query(
      'SELECT "name" FROM "_migrations" ORDER BY "id"'
    );
    const executedNames = new Set(executed.map((r: { name: string }) => r.name));

    // Read migration files
    const migrationsDir = path.resolve(__dirname, '../migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      console.log('No migration files found.');
      return;
    }

    let applied = 0;
    for (const file of files) {
      if (executedNames.has(file)) {
        console.log(`  ⊘ ${file} (already applied)`);
        continue;
      }

      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      console.log(`  → Applying ${file}...`);

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO "_migrations" ("name") VALUES ($1)',
          [file],
        );
        await client.query('COMMIT');
        console.log(`  ✓ ${file} applied`);
        applied++;
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`  ✗ ${file} failed:`, err);
        throw err;
      }
    }

    console.log(`\n✓ ${applied} migration(s) applied, ${executedNames.size} already up-to-date.`);
  } finally {
    await client.end();
  }
}

runMigrations().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
