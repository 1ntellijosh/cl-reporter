/**
 * Integration tests for POST /api/auth/logout — Logout route.
 *
 * @since setup-tests--JP
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { APP_BILLING_STATUS_COOKIE_NAME, APP_SESSION_ACCESS_COOKIE_NAME, OAUTH_STATE_COOKIE_NAME } from '@reporter/common';
import { NextRequest } from 'next/server';
import { POST } from '../../../../app/api/auth/logout/route';
import { setValidOAuthEnv } from '../../../JestSetup';
import { cookieStoreMocks } from '../../../mocks/next-headers';
import { SessionModule } from '../../../../lib/sessions/SessionModule';

function logoutRequest(): NextRequest {
  return new NextRequest('https://app.example.com/api/auth/logout');
}

describe('GET /api/auth/logout (logout route)', () => {
  beforeEach(async () => {
    setValidOAuthEnv();
    cookieStoreMocks.delete.mockReset();
    const token = 'test-token';
    await SessionModule.setAppSessionCookie(token);
    const billingStatus = 'ACTIVE';
    await SessionModule.setBillingStatusCookie(billingStatus);
    jest.spyOn(SessionModule, 'clearAppSession').mockResolvedValue(undefined);
  });

  it('clears app session and billing status cookies', async () => {
    const req = logoutRequest();
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ message: 'Logged out successfully' });
    expect(SessionModule.clearAppSession).toHaveBeenCalledTimes(1);
  });
});
