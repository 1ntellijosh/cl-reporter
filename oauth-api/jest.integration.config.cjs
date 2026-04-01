/**
 * Jest config for HTTP integration tests under `tests/int/` (expects Postgres via `DATABASE_URL`).
 *
 * @since setup-tests--JP
 */

/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  globalSetup: '<rootDir>/tests/testcontainers.globalSetup.cjs',
  testMatch: ['<rootDir>/tests/int/**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/tests/JestSetup.integration.ts'],
  testTimeout: 120_000,
  collectCoverageFrom: ['src/**/*.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
};
