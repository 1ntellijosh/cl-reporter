/**
 * DB lifecycle for integration tests (`tests/int/**`).
 *
 * **Connection string**
 * - **CI / manual:** set `DATABASE_URL` (e.g. GitHub Actions Postgres service or local Postgres).
 * - **Local + Docker, no `DATABASE_URL`:** `tests/testcontainers.globalSetup.cjs` starts Postgres via Testcontainers
 *   and writes `tests/.testcontainers-pg-state.json`; we read it here so Jest workers get the same URI.
 *
 * @since setup-tests--JP
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { connectDatabase, disconnectDatabase } from '@reporter/middleware';

const TESTCONTAINERS_STATE = path.join(__dirname, '.testcontainers-pg-state.json');

function resolveDatabaseUrl(): string {
  const fromEnv = process.env.DATABASE_URL?.trim();
  if (fromEnv) {
    return fromEnv;
  }

  if (fs.existsSync(TESTCONTAINERS_STATE)) {
    const { uri } = JSON.parse(fs.readFileSync(TESTCONTAINERS_STATE, 'utf8')) as { uri: string };
    process.env.DATABASE_URL = uri;

    return uri;
  }

  throw new Error(
    'Integration tests need a database URL: set DATABASE_URL, or run with Docker so Testcontainers can start Postgres (see oauth-api/tests/testcontainers.globalSetup.cjs).',
  );
}

beforeAll(async () => {
  resolveDatabaseUrl();
  await connectDatabase();
});

afterAll(async () => {
  await disconnectDatabase();
});
