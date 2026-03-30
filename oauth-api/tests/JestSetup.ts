/**
 * Main entry point for OAuth API Jest setup and testing
 *
 * @since app-skaffold--JP
 */

// jest.mock('@reporter/core', () => {
//   const actual = jest.requireActual('@reporter/core');
  
//   // Mock EventPublisher as a class with prototype method so jest.spyOn works
//   class MockEventPublisher {
//     constructor(factory: any) {
//       // Accept factory parameter but don't use it
//     }
//     async publishEvent(...args: any[]): Promise<void> {
//       // Default implementation - can be spied on
//       return Promise.resolve();
//     }
//   }
  
//   return {
//     ...actual,
//     EventPublisher: MockEventPublisher,
//   };
// });

const SETUP_TIMEOUT_MS = 30_000;

// Create DB once; clear before each test (no per-test server creation).
jest.setTimeout(15_000); // Hooks and tests in CI may be slow; 5s default can cause intermittent failures.

beforeAll(async () => {
  process.env.JWT_KEY = 'test-jwt-key';

}, SETUP_TIMEOUT_MS);

beforeEach(async () => {
  // Will need to clear the database before each test
});

afterAll(async () => {
  // Will need to close and stop the database connection before each test
}, SETUP_TIMEOUT_MS);
