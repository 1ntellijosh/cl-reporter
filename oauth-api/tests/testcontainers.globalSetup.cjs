/**
 * Jest globalSetup for integration tests:
 * - Starts Postgres via Testcontainers,
 * - applies Drizzle migrations,
 * - writes `tests/.testcontainers-pg-state.json` so workers can connect.
 *
 * @since setup-tests--JP
 */

const { PostgreSqlContainer } = require('@testcontainers/postgresql');
const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const STATE_FILE = path.join(__dirname, '.testcontainers-pg-state.json');

/** Monorepo root (…/cl-reporter), from `oauth-api/tests/`. */
function monorepoRoot() {
  return path.join(__dirname, '..', '..');
}

function runMigrations(databaseUrl) {
  execSync('npm run db:migrate -w @reporter/middleware', {
    cwd: monorepoRoot(),
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'inherit',
  });
}

module.exports = async function globalSetup() {
  if (process.env.DATABASE_URL?.trim()) {
    return async () => {};
  }

  const container = await new PostgreSqlContainer('postgres:16')
    .withDatabase('cl_reporter_test')
    .withUsername('postgres')
    .withPassword('postgres')
    .start();

  const uri = container.getConnectionUri();

  try {
    runMigrations(uri);
  } catch (err) {
    await container.stop();
    throw err;
  }

  fs.writeFileSync(STATE_FILE, JSON.stringify({ uri }));

  return async () => {
    await container.stop();
    if (fs.existsSync(STATE_FILE)) {
      fs.unlinkSync(STATE_FILE);
    }
  };
};
