/**
 * Jest configuration for the client next.js project
 *
 * @since setup-tests--JP
 */

const nextJest = require('next/jest');

const createJestConfig = nextJest({ dir: './' });

/** @type {import('jest').Config} */
const customJestConfig = {
  coverageProvider: 'v8',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/tests/**/*.test.ts', '<rootDir>/src/**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/tests/JestSetup.ts'],
  modulePathIgnorePatterns: ['<rootDir>/.next/'],
  /** Override Next’s `next/headers` stub so unit tests can assert on `cookies().set`. */
  moduleNameMapper: {
    '^next/headers$': '<rootDir>/src/tests/mocks/next-headers.ts',
  },
};

module.exports = createJestConfig(customJestConfig);
