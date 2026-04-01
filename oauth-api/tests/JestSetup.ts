/**
 * Main entry point for OAuth API Jest setup and testing
 *
 * @since app-skaffold--JP
 */

// jest.mock('@reporter/middleware', () => {
//   const actual = jest.requireActual('@reporter/middleware');
  
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

// Unit / package tests: no database.
// Integration tests use `jest.integration.config.cjs` + `tests/JestSetup.integration.ts` and require `DATABASE_URL`.
