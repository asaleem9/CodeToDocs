import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

// Database connection string from environment
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn('DATABASE_URL not set - database features will be disabled');
}

// TLS config for the database connection. Verify certificates by default in
// production; an operator can supply a CA (DATABASE_CA_CERT) or, only if their
// provider genuinely requires it, opt out via DATABASE_SSL_REJECT_UNAUTHORIZED=false.
const productionSsl = {
  rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false',
  ca: process.env.DATABASE_CA_CERT || undefined,
};

// Create connection pool
export const pool = connectionString ? new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? productionSsl : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
}) : null;

// Create Drizzle instance with schema
export const db = pool ? drizzle(pool, { schema }) : null;

// Health check function
export async function checkDatabaseConnection(): Promise<boolean> {
  if (!pool) {
    console.log('Database pool not initialized');
    return false;
  }

  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    console.log('✓ Database connection successful');
    return true;
  } catch (error) {
    console.error('✗ Database connection failed:', error);
    return false;
  }
}

// Graceful shutdown
export async function closeDatabaseConnection(): Promise<void> {
  if (pool) {
    await pool.end();
    console.log('Database connection pool closed');
  }
}
