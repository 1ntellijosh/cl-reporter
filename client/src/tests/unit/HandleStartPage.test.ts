/**
 * Unit tests for HandleStartPage.ts
 *
 * @since setup-tests--JP

 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { UserJwtPayload } from '@reporter/common';
import { handleStartPage } from '../../lib/start/HandleStartPage';
import { CL_ROUTES } from '../../lib/enums/ClientRoutes';
import { SessionModule } from '../../lib/sessions/SessionModule';

function samplePayload(overrides: Partial<UserJwtPayload> = {}): UserJwtPayload {
  return {
    cloverMerchantId: 'merchant-1',
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
    ...overrides,
  };
}

describe('handleStartPage', () => {
  beforeEach(() => {
    delete process.env.CLOVER_CLIENT_ID;
    jest.spyOn(SessionModule, 'getAppSessionPayload').mockResolvedValue(null);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('OAuth code in query (scenario 1)', () => {
    it('redirects to complete-clover with code and state', async () => {
      const result = await handleStartPage({
        code: '  auth-code  ',
        state: 'state-token',
      });

      expect(result).toBe(`${CL_ROUTES.COMPLETE_CLOVER}?code=auth-code&state=state-token`);
      expect(SessionModule.getAppSessionPayload).not.toHaveBeenCalled();
    });

    it('uses empty state when state is omitted, still returns complete-clover', async () => {
      const result = await handleStartPage({ code: 'c' });

      expect(result).toBe(`${CL_ROUTES.COMPLETE_CLOVER}?code=c&state=`);
    });
  });

  describe('existing app session (scenario 2)', () => {
    it('returns dashboard when session is valid and no merchant_id in query', async () => {
      jest.mocked(SessionModule.getAppSessionPayload).mockResolvedValue(samplePayload());

      const result = await handleStartPage({});

      expect(result).toBe(CL_ROUTES.REPORTS_DASHBOARD);
    });

    it('returns dashboard when merchant_id matches JWT tenant', async () => {
      jest.mocked(SessionModule.getAppSessionPayload).mockResolvedValue(samplePayload({ cloverMerchantId: 'm-99' }));

      const result = await handleStartPage({ merchant_id: 'm-99' });

      expect(result).toBe(CL_ROUTES.REPORTS_DASHBOARD);
    });

    it('accepts merchantId alias matching JWT tenant', async () => {
      jest.mocked(SessionModule.getAppSessionPayload).mockResolvedValue(samplePayload({ cloverMerchantId: 'm-99' }));

      const result = await handleStartPage({ merchantId: 'm-99' });

      expect(result).toBe(CL_ROUTES.REPORTS_DASHBOARD);
    });

    it('logs out and returns oauth callback when merchant_id does not match session tenant', async () => {
      process.env.CLOVER_CLIENT_ID = 'expected-id';
      jest.mocked(SessionModule.getAppSessionPayload).mockResolvedValue(samplePayload({ cloverMerchantId: 'm-a' }));

      jest.spyOn(SessionModule, 'clearAppSession').mockResolvedValue(undefined);

      const result = await handleStartPage({ merchant_id: 'm-b' });

      expect(result).toBe(CL_ROUTES.OAUTH_CALLBACK);
      expect(SessionModule.clearAppSession).toHaveBeenCalled();
    });
  });

  describe('initial load for cold start with no session or code (scenario 3)', () => {
    it('returns oauth callback when no client_id (begin authorize)', async () => {
      const result = await handleStartPage({});

      expect(result).toBe(CL_ROUTES.OAUTH_CALLBACK);
    });
  });
});
