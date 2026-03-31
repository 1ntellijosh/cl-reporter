/**
 * Database connection module for Clover Reporter app
 *
 * @since drizzle-the-db--JP
 */

import { DatabaseConnectionError } from '@reporter/common';
import * as schema from './schema';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

let sql: postgres.Sql | undefined;

export let db!: PostgresJsDatabase<typeof schema>;

export async function connectDatabase(): Promise<void> {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new DatabaseConnectionError('DATABASE_URL is not defined');
  }

  sql = postgres(url, { max: 10 });
  try {
    await sql`select 1`;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (sql) {
      await sql.end({ timeout: 2 });
      sql = undefined;
    }
    throw new DatabaseConnectionError(
      `oauth-api failed to connect to database: ${message}`,
    );
  }

  db = drizzle(sql, { schema });
}

export async function disconnectDatabase(): Promise<void> {
  if (sql) {
    await sql.end({ timeout: 5 });
    sql = undefined;
  }
}
