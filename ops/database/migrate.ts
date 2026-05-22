/**
 * Drizzle migrations for Clover Reporter app
 *
 * @since drizzle-the-db--JP
 */

import path from 'node:path';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

function migrationsFolder(): string {
  return path.join(__dirname, 'migrations');
}

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url || url.trim() === '') {
    console.error(
      'DATABASE_URL is required (e.g. postgresql://user:pass@host:5432/cl_reporter)',
    );
    process.exit(1);
  }

  const sql = postgres(url, { max: 1 });
  const db = drizzle(sql);

  try {
    await migrate(db, { migrationsFolder: migrationsFolder() });
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
