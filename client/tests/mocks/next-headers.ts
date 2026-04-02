/**
 * Test double for `next/headers` — Jest resolves this via `moduleNameMapper` (see `jest.config.cjs`).
 *
 * @since app-login--JP
 */
import { jest } from '@jest/globals';

export const cookieStoreMocks = {
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
};

export async function cookies(): Promise<typeof cookieStoreMocks> {
  return cookieStoreMocks;
}
