/**
 * Database setup — creates the TMS database if it doesn't exist.
 * Run this once before migrations.
 */

import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const DB_HOST = process.env.DB_HOST || '163.128.43.44';
const DB_PORT = Number(process.env.DB_PORT) || 5432;
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || '1234';
const DB_NAME = process.env.DB_NAME || 'ht_tms';

async function setupDatabase() {
  // Connect to default 'postgres' database to create our database
  const mainDbUrl = process.env.DATABASE_URL?.replace(/\/ht_tms/, '/postgres') || '';
  const client = new pg.Client({
    connectionString: mainDbUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('✓ Connected to PostgreSQL');

    // Check if database exists
    const { rows } = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [DB_NAME],
    );

    if (rows.length === 0) {
      await client.query(`CREATE DATABASE "${DB_NAME}"`);
      console.log(`✓ Database "${DB_NAME}" created`);
    } else {
      console.log(`✓ Database "${DB_NAME}" already exists`);
    }
  } finally {
    await client.end();
  }
}

setupDatabase().catch(err => {
  console.error('Database setup failed:', err);
  process.exit(1);
});
