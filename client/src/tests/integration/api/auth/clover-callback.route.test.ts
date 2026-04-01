/**
 * Integration tests for GET /api/auth/clover-callback — OAuth authorize redirect + `state` cookie.
 *
 * @since setup-tests--JP
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { OAUTH_STATE_COOKIE_NAME } from '@reporter/common';
import { NextRequest } from 'next/server';
import { GET } from '../../../../app/api/auth/clover-callback/route';
import { CL_ROUTES } from '../../../../lib/enums/ClientRoutes';
import { stashOAuthEnv, restoreOAuthEnv, setValidOAuthEnv } from '../../../JestSetup';
import { OAUTH_ENV_KEYS } from '../../../JestSetup';

function callbackRequest(): NextRequest {
  return new NextRequest('https://app.example.com/api/auth/clover-callback');
}

describe('GET /api/auth/clover-callback (clover-callback route)', () => {
  beforeEach(() => {
    stashOAuthEnv();
    jest.spyOn(crypto, 'randomUUID').mockReturnValue('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
  });

  afterEach(() => {
    jest.restoreAllMocks();
    restoreOAuthEnv();
  });

  describe('when OAuth env is incomplete', () => {
    it('returns 307 redirect to error page when all OAuth vars are unset', async () => {
      for (const key of OAUTH_ENV_KEYS) {
        delete process.env[key];
      }

      const req = callbackRequest();
      const res = GET(req);

      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toBe(new URL(CL_ROUTES.ERROR, req.url).toString());
    });

    it('returns 307 redirect to error page when CLOVER_CLIENT_ID is missing', async () => {
      delete process.env.CLOVER_CLIENT_ID;
      process.env.CLOVER_OAUTH_AUTHORIZE_BASE = 'https://apisandbox.dev.clover.com';
      process.env.CLOVER_REDIRECT_URI = 'https://app.example.com/cb';

      const req = callbackRequest();
      const res = GET(req);

      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toBe(new URL(CL_ROUTES.ERROR, req.url).toString());
    });

    it('returns 307 redirect to error page when CLOVER_OAUTH_AUTHORIZE_BASE is missing', async () => {
      process.env.CLOVER_CLIENT_ID = 'id';
      delete process.env.CLOVER_OAUTH_AUTHORIZE_BASE;
      process.env.CLOVER_REDIRECT_URI = 'https://app.example.com/cb';

      const req = callbackRequest();
      const res = GET(req);

      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toBe(new URL(CL_ROUTES.ERROR, req.url).toString());
    });

    it('returns 307 redirect to error page when CLOVER_REDIRECT_URI is missing', async () => {
      process.env.CLOVER_CLIENT_ID = 'id';
      process.env.CLOVER_OAUTH_AUTHORIZE_BASE = 'https://apisandbox.dev.clover.com';
      delete process.env.CLOVER_REDIRECT_URI;

      const req = callbackRequest();
      const res = GET(req);

      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toBe(new URL(CL_ROUTES.ERROR, req.url).toString());
    });
  });

  describe('when OAuth env is complete', () => {
    beforeEach(() => {
      setValidOAuthEnv();
    });

    it('returns 307 redirect to Clover authorize URL with expected query params', () => {
      const req = callbackRequest();
      const res = GET(req);

      expect(res.status).toBe(307);
      const location = res.headers.get('location');
      expect(location).toBeTruthy();

      const url = new URL(location!);
      expect(url.origin + url.pathname).toBe('https://apisandbox.dev.clover.com/oauth/v2/authorize');
      expect(url.searchParams.get('client_id')).toBe('test-client-id');
      expect(url.searchParams.get('redirect_uri')).toBe('https://app.example.com/api/auth/complete-clover');
      expect(url.searchParams.get('response_type')).toBe('code');
      expect(url.searchParams.get('state')).toBe('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
    });

    it('sets HttpOnly state cookie matching authorize URL state param', () => {
      const res = GET(callbackRequest());

      const setCookies =
        typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [res.headers.get('set-cookie')!];

      const stateCookie = setCookies.find((c) => c.startsWith(`${OAUTH_STATE_COOKIE_NAME}=`));
      expect(stateCookie).toBeDefined();
      expect(stateCookie).toContain('HttpOnly');
      expect(stateCookie).toContain('Path=/');
      expect(stateCookie).toContain('Max-Age=600');
      expect(stateCookie?.toLowerCase()).toContain('samesite=lax');
      expect(stateCookie).toContain(`=${'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'}`);
    });

    it('sets Secure on state cookie only in production', () => {
      const env = process.env as Record<string, string | undefined>;
      const prevNodeEnv = env.NODE_ENV;
      env.NODE_ENV = 'production';

      try {
        const res = GET(callbackRequest());
        const setCookies =
          typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [res.headers.get('set-cookie')!];
        const stateCookie = setCookies.find((c) => c.startsWith(`${OAUTH_STATE_COOKIE_NAME}=`));
        expect(stateCookie).toContain('Secure');
      } finally {
        if (prevNodeEnv === undefined) {
          delete env.NODE_ENV;
        } else {
          env.NODE_ENV = prevNodeEnv;
        }
      }
    });

    it('does not set Secure on state cookie when not in production', () => {
      const env = process.env as Record<string, string | undefined>;
      const prevNodeEnv = env.NODE_ENV;
      env.NODE_ENV = 'development';

      try {
        const res = GET(callbackRequest());
        const setCookies =
          typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [res.headers.get('set-cookie')!];
        const stateCookie = setCookies.find((c) => c.startsWith(`${OAUTH_STATE_COOKIE_NAME}=`));
        expect(stateCookie).toBeDefined();
        expect(stateCookie).not.toContain('Secure');
      } finally {
        if (prevNodeEnv === undefined) {
          delete env.NODE_ENV;
        } else {
          env.NODE_ENV = prevNodeEnv;
        }
      }
    });
  });
});
