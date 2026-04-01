/**
 * Tests for BearerAuth middleware
 *
 * @since setup-tests--JP
 */
import {
  getAppSessionAccessTtlSeconds,
  signAppSessionAccessToken,
  verifyBearerAccessToken,
  parseCloverMerchantIdFromAccessJwt,
  extractUserPayloadFromBearerOrAppSessionCookie,
  extractAppSessionJwtFromCookieHeader,
  parseBearerAuthorization,
} from '@reporter/common';

const DEFAULT_APP_SESSION_ACCESS_TTL_SECONDS = 1800;

/**
 * Minimal JWT-shaped string whose payload matches Clover access tokens (`merchant_uuid`).
 * {@link parseCloverMerchantIdFromAccessJwt} only decodes the payload; it does not verify the signature.
 */
function cloverOAuthAccessJwtFixture(merchantUuid: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ merchant_uuid: merchantUuid })).toString('base64url');

  return `${header}.${payload}.sig`;
}

describe('BearerAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SIGNING_KEY = 'test-key';
  });

  describe('getAppSessionAccessTtlSeconds', () => {
    it('returns the default app session access ttl seconds if env not set', () => {
      const ttl = getAppSessionAccessTtlSeconds();
      expect(ttl).toBe(DEFAULT_APP_SESSION_ACCESS_TTL_SECONDS);
    });

    it('returns the app session access ttl seconds if env set', () => {
      process.env.APP_SESSION_ACCESS_TTL_SECONDS = '3600';
      const ttl = getAppSessionAccessTtlSeconds();
      expect(ttl).toBe(3600);
    });

    it('returns the app session access ttl seconds if env set to a negative number', () => {
      process.env.APP_SESSION_ACCESS_TTL_SECONDS = '-1';
      const ttl = getAppSessionAccessTtlSeconds();
      expect(ttl).toBe(DEFAULT_APP_SESSION_ACCESS_TTL_SECONDS);
    });
  });

  describe('signAppSessionAccessToken', () => {
    it('returns a signed app session access token', () => {
      const token = signAppSessionAccessToken('test-key', 'test-merchant-id');

      expect(token).toBeDefined();
      expect(token).not.toBeNull();
    });

    it('returns a signed app session access token with a custom ttl', () => {
      const token = signAppSessionAccessToken('test-key', 'test-merchant-id', { ttlSeconds: 3600 });
      
      expect(token).toBeDefined();
      expect(token).not.toBeNull();
    });
  });

  describe('verifyBearerAccessToken', () => {
    it('returns a verified bearer access token', () => {
      const token = signAppSessionAccessToken('test-key', 'test-merchant-id');
      const verified = verifyBearerAccessToken(token, 'test-key');
      expect(verified).toBeDefined();
      expect(verified).not.toBeNull();
      expect(verified.cloverMerchantId).toBe('test-merchant-id');
      expect(verified.exp).toBeDefined();
      expect(verified.iat).toBeDefined();
    });
  });

  describe('parseCloverMerchantIdFromAccessJwt', () => {
    it('throws an error if the access jwt is invalid', () => {
      const token = 'invalid-token';
      expect(() => parseCloverMerchantIdFromAccessJwt(token)).toThrow('Invalid access token format');
    });

    it('throws an error if the access jwt is missing the merchant id', () => {
      const token = signAppSessionAccessToken('test-key', 'test-merchant-id');
      expect(() => parseCloverMerchantIdFromAccessJwt(token)).toThrow('Clover access JWT missing merchant_uuid claim');
    });

    it('returns merchant_uuid from a Clover OAuth access JWT payload', () => {
      const token = cloverOAuthAccessJwtFixture('clover-mid-123');

      expect(parseCloverMerchantIdFromAccessJwt(token)).toBe('clover-mid-123');
    });
  });
  
  describe('extractUserPayloadFromBearerOrAppSessionCookie', () => {
    it('returns the user payload from the bearer authorization header if the authorization header is valid', () => {
      const token = signAppSessionAccessToken('test-key', 'test-merchant-id');
      const authorizationHeader = `bearer ${token}`;
      const userPayload = extractUserPayloadFromBearerOrAppSessionCookie(authorizationHeader, undefined, 'test-key');
      expect(userPayload).toBeDefined();
      expect(userPayload).not.toBeNull();
      expect(userPayload?.cloverMerchantId).toBe('test-merchant-id');
      expect(userPayload?.exp).toBeDefined();
      expect(userPayload?.iat).toBeDefined();
    });

    it('returns the user payload from the app session cookie if the app session cookie is valid', () => {
      const token = signAppSessionAccessToken('test-key', 'test-merchant-id');
      const appSessionCookie = `cl_reporter_app_access=${token}`;
      const userPayload = extractUserPayloadFromBearerOrAppSessionCookie(undefined, appSessionCookie, 'test-key');
      expect(userPayload).toBeDefined();
      expect(userPayload).not.toBeNull();
      expect(userPayload?.cloverMerchantId).toBe('test-merchant-id');
      expect(userPayload?.exp).toBeDefined();
      expect(userPayload?.iat).toBeDefined();
    });

    it('returns null if the app session cookie is invalid', () => {
      const appSessionCookie = 'cl_reporter_app_access=invalid-token';
      const userPayload = extractUserPayloadFromBearerOrAppSessionCookie(undefined, appSessionCookie, 'test-key');
      expect(userPayload).toBeNull();
    });
  });

  describe('extractAppSessionJwtFromCookieHeader', () => {
  it('returns the app session jwt from the app session cookie if the app session cookie is valid', () => {
    const token = signAppSessionAccessToken('test-key', 'test-merchant-id');
    const appSessionCookie = `cl_reporter_app_access=${token}`;
    const appSessionJwt = extractAppSessionJwtFromCookieHeader(appSessionCookie);
      expect(appSessionJwt).toBeDefined();
      expect(appSessionJwt).not.toBeNull();
      expect(appSessionJwt).toBe(token);
    });
  });

  describe('parseBearerAuthorization', () => {
    it('returns the bearer authorization if the authorization header is valid', () => {
      const authorizationHeader = 'Bearer test-token';
      const bearerAuthorization = parseBearerAuthorization(authorizationHeader);
      expect(bearerAuthorization).toBe('test-token');
    });

    it('returns null if the authorization header is invalid', () => {
      const authorizationHeader = 'Invalid-token';
      const bearerAuthorization = parseBearerAuthorization(authorizationHeader);
      expect(bearerAuthorization).toBeNull();
    });

    it('returns null if the authorization header is null', () => {
      const authorizationHeader = null;
      const bearerAuthorization = parseBearerAuthorization(authorizationHeader);
      expect(bearerAuthorization).toBeNull();
    });

    it('returns null if the authorization header is undefined', () => {
      const authorizationHeader = undefined;
      const bearerAuthorization = parseBearerAuthorization(authorizationHeader);
      expect(bearerAuthorization).toBeNull();
    });
  });
});
