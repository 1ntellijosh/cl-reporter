"use strict";
/**
 * Main entry point for OAuth API Jest setup and testing
 *
 * @since app-skaffold--JP
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
const SETUP_TIMEOUT_MS = 30000;
// Create DB once; clear before each test (no per-test server creation).
jest.setTimeout(15000); // Hooks and tests in CI may be slow; 5s default can cause intermittent failures.
beforeAll(() => __awaiter(void 0, void 0, void 0, function* () {
    process.env.JWT_KEY = 'test-jwt-key';
}), SETUP_TIMEOUT_MS);
beforeEach(() => __awaiter(void 0, void 0, void 0, function* () {
    // Will need to clear the database before each test
}));
afterAll(() => __awaiter(void 0, void 0, void 0, function* () {
    // Will need to close and stop the database connection before each test
}), SETUP_TIMEOUT_MS);
