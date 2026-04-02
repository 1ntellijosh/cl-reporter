/**
 * Integration tests for GET /api/auth/complete-clover — OAuth code exchange + session cookies + redirects.
 *
 * @since setup-tests--JP
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { API, OAUTH_STATE_COOKIE_NAME } from '@reporter/common';
import { NextRequest } from 'next/server';
import { GET as completeCloverGET } from '../../../../src/app/api/auth/complete-clover/route';
import { CL_ROUTES } from '../../../../src/lib/enums/ClientRoutes';
import { SessionModule } from '../../../../src/lib/sessions/SessionModule';
import { cookieStoreMocks } from '../../../mocks/next-headers';
import { stashOAuthEnv, restoreOAuthEnv, setValidOAuthEnv } from '../../../JestSetup';

const BASE_URL = 'https://app.example.com/api/auth/complete-clover';
const URL_EMPTY_CODE = `${BASE_URL}?code=`;
const URL_EMPTY_STATE = `${BASE_URL}?code=code&state=`;
/** `code` and `state` query params match mocked OAuth `state` cookie (CSRF check passes). */
const URL_EXCHANGE_OK = `${BASE_URL}?code=auth-code&state=state-match`;
const REDIRECT_ORIGIN = 'https://app.example.com';
const REDIRECT_URI = `${REDIRECT_ORIGIN}/api/auth/complete-clover`;

/**
 * `NextRequest` in Jest does not always infer `Host` from the URL; the route forwards Host/Cookie to oauth-api.
 */
function completeCloverRequest(url: string, extraHeaders?: Record<string, string>): NextRequest {
  return new NextRequest(url, {
    headers: {
      host: 'app.example.com',
      ...extraHeaders,
    },
  });
}

function absolutePath(pathname: string): string {
  return new URL(pathname, `${REDIRECT_ORIGIN}/`).toString();
}

describe('GET /api/auth/complete-clover (complete-clover route)', () => {
  beforeEach(() => {
    stashOAuthEnv();
    setValidOAuthEnv();
    cookieStoreMocks.get.mockReset();
    cookieStoreMocks.delete.mockReset();
    cookieStoreMocks.set.mockReset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    restoreOAuthEnv();
  });

  it('returns 307 redirect to oauth callback when code is empty', async () => {
    const req = completeCloverRequest(URL_EMPTY_CODE);
    const res = await completeCloverGET(req);

    expect(res.status).toBe(307);
    const location = res.headers.get('location');
    expect(location).toBeTruthy();
    expect(location).toBe(absolutePath(CL_ROUTES.OAUTH_CALLBACK));
  });

  it('returns 307 redirect to oauth callback when state does not match', async () => {
    const req = completeCloverRequest(URL_EMPTY_STATE);
    const res = await completeCloverGET(req);

    expect(res.status).toBe(307);
    const location = res.headers.get('location');
    expect(location).toBeTruthy();
    expect(location).toBe(absolutePath(CL_ROUTES.OAUTH_CALLBACK));
  });

  describe('when CSRF state matches and oauth-api exchange succeeds', () => {
    beforeEach(() => {
      cookieStoreMocks.get.mockImplementation((name: unknown) =>
        name === OAUTH_STATE_COOKIE_NAME ? { value: 'state-match' } : undefined,
      );
      jest.spyOn(API.auth, 'exchangeCloverCode').mockResolvedValue({
        cloverMerchantId: 'm-merchant-1',
        billingStatus: 'ACTIVE',
      });
      jest.spyOn(SessionModule, 'mintAppSessionJwt').mockReturnValue('signed-app-jwt');
      jest.spyOn(SessionModule, 'setAppSessionCookie').mockResolvedValue(undefined);
      jest.spyOn(SessionModule, 'setBillingStatusCookie').mockResolvedValue(undefined);
    });

    it('exchanges code, mints session JWT, sets cookies, clears state cookie, redirects to dashboard', async () => {
      const req = completeCloverRequest(URL_EXCHANGE_OK);
      const res = await completeCloverGET(req);

      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toBe(absolutePath(CL_ROUTES.REPORTS_DASHBOARD));

      expect(API.auth.exchangeCloverCode).toHaveBeenCalledWith(
        { code: 'auth-code', redirectUri: REDIRECT_URI },
        expect.objectContaining({
          headers: expect.objectContaining({
            Cookie: '',
            Host: 'app.example.com',
          }),
        }),
      );

      expect(SessionModule.mintAppSessionJwt).toHaveBeenCalledWith('m-merchant-1');
      expect(SessionModule.setAppSessionCookie).toHaveBeenCalledWith('signed-app-jwt');
      expect(SessionModule.setBillingStatusCookie).toHaveBeenCalledWith('ACTIVE');
      expect(cookieStoreMocks.delete).toHaveBeenCalledWith(OAUTH_STATE_COOKIE_NAME);
    });
  });

  describe('when CSRF state matches but oauth-api exchange fails', () => {
    beforeEach(() => {
      cookieStoreMocks.get.mockImplementation((name: unknown) =>
        name === OAUTH_STATE_COOKIE_NAME ? { value: 'state-match' } : undefined,
      );
      jest.spyOn(API.auth, 'exchangeCloverCode').mockRejectedValue(new Error('token endpoint failed'));
      jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    it('returns 307 redirect to error page', async () => {
      const req = completeCloverRequest(URL_EXCHANGE_OK);
      const res = await completeCloverGET(req);

      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toBe(absolutePath(CL_ROUTES.ERROR));
    });
  });
});
