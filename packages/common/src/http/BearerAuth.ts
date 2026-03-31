/**
 * Helpers for `Authorization: Bearer` app-session JWTs (Express and shared server code).
 *
 * @since app-login--JP
 */
import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { APP_SESSION_ACCESS_COOKIE_NAME } from '../consts/SessionConsts';
import type { UserJwtPayload } from '../contracts/AppSessionJwt';

/**
 * Default access JWT TTL (seconds); (authorization-flow §6.1).
 * - Currently 30 minutes.
 */
const DEFAULT_APP_SESSION_ACCESS_TTL_SECONDS = 1800;

/**
 * Resolved TTL for the app access JWT and matching `Set-Cookie` `Max-Age` (seconds).
 */
export function getAppSessionAccessTtlSeconds(): number {
  const raw = process.env.APP_SESSION_ACCESS_TTL_SECONDS;

  if (raw == null || raw === '') {
    return DEFAULT_APP_SESSION_ACCESS_TTL_SECONDS;
  }

  const n = Number.parseInt(raw, 10);

  return Number.isFinite(n) && n > 0 ? n : DEFAULT_APP_SESSION_ACCESS_TTL_SECONDS;
}

/**
 * Signs a short-lived HS256 app access JWT (`cloverMerchantId`, `jti`, `iat`, `exp`).
 * Call only on trusted servers (`JWT_SIGNING_KEY`); never ship the key to the browser.
 *
 * @param signingKey - `JWT_SIGNING_KEY`
 * @param cloverMerchantId - Clover merchant id (`mId`)
 * @param options - optional `ttlSeconds` (defaults to {@link getAppSessionAccessTtlSeconds})
 */
export function signAppSessionAccessToken(
  signingKey: string,
  cloverMerchantId: string,
  options?: { ttlSeconds?: number },
): string {
  const ttlSeconds = options?.ttlSeconds ?? getAppSessionAccessTtlSeconds();
  const jti = randomUUID();

  return jwt.sign({ cloverMerchantId, jti }, signingKey, {
    algorithm: 'HS256',
    expiresIn: ttlSeconds,
  });
}

/**
 * Extracts the raw JWT from an `Authorization` header value.
 *
 * @param authorizationHeader - Value of `Authorization` (e.g. `Bearer eyJ...`).
 * @returns Token string, or null if missing or not a Bearer scheme.
 */
export function parseBearerAuthorization(authorizationHeader: string | undefined | null): string | null {
  if (authorizationHeader == null || typeof authorizationHeader !== 'string') return null;

  const trimmed = authorizationHeader.trim();

  if (!trimmed.toLowerCase().startsWith('bearer ')) return null;

  // Remove the "Bearer " prefix and trim whitespace.
  const token = trimmed.slice(7).trim();

  if (!token) return null;

  return token;
}

/**
 * Verifies a Bearer token using the app signing key (HS256).
 *
 * @param token - JWT string without the `Bearer ` prefix.
 * @param signingKey - `JWT_SIGNING_KEY` material.
 *
 * @returns Decoded payload.
 *
 * @throws Error from `jsonwebtoken` if verification fails.
 */
export function verifyBearerAccessToken(token: string, signingKey: string): UserJwtPayload {
  return jwt.verify(token, signingKey) as UserJwtPayload;
}

/**
 * Extracts and verifies `UserJwtPayload` from `Authorization: Bearer` (read-only; does not mutate the request).
 *
 * @param authorizationHeader - Raw `Authorization` header value.
 * @param signingKey - `JWT_SIGNING_KEY`; if missing, returns null.
 *
 * @returns Verified claims, or null if absent/invalid.
 */
export function extractUserPayloadFromBearerHeader(
  authorizationHeader: string | undefined,
  signingKey: string | undefined,
): UserJwtPayload | null {
  if (!signingKey) return null;

  const token = parseBearerAuthorization(authorizationHeader);

  if (!token) return null;

  try {
    return verifyBearerAccessToken(token, signingKey);
  } catch {
    return null;
  }
}

/**
 * Reads the raw JWT value for {@link APP_SESSION_ACCESS_COOKIE_NAME} from a `Cookie` header (no `cookie-parser` required).
 */
export function extractAppSessionJwtFromCookieHeader(cookieHeader: string | undefined): string | null {
  if (cookieHeader == null || cookieHeader === '') return null;

  const prefix = `${APP_SESSION_ACCESS_COOKIE_NAME}=`;

  for (const part of cookieHeader.split(';')) {
    const trimmed = part.trim();

    if (trimmed.startsWith(prefix)) {
      const raw = trimmed.slice(prefix.length);

      try {
        return decodeURIComponent(raw);
      } catch {
        return raw;
      }
    }
  }

  return null;
}

/**
 * Resolves verified {@link UserJwtPayload} from `Authorization: Bearer` first, then from the app-session HttpOnly cookie
 * set by Next.js (`SessionModule.setAppSessionCookie`). Same signing key for both.
 */
export function extractUserPayloadFromBearerOrAppSessionCookie(
  authorizationHeader: string | undefined,
  cookieHeader: string | undefined,
  signingKey: string | undefined,
): UserJwtPayload | null {
  const fromBearer = extractUserPayloadFromBearerHeader(authorizationHeader, signingKey);

  if (fromBearer) return fromBearer;

  if (!signingKey) return null;

  const token = extractAppSessionJwtFromCookieHeader(cookieHeader);

  if (!token?.trim()) return null;

  try {
    return verifyBearerAccessToken(token.trim(), signingKey);
  } catch {
    return null;
  }
}

/**
 * Reads `merchant_uuid` from a Clover access JWT (payload only; token already came from Clover over TLS).
 *
 * @param accessToken - Clover access JWT.
 *
 * @throws Error if the claim is missing (confirm field name against sandbox token payload if this fails).
 */
export function parseCloverMerchantIdFromAccessJwt(accessToken: string): string {
  const parts = accessToken.split('.');

  if (parts.length !== 3) {
    throw new Error('Invalid access token format');
  }

  const payload = JSON.parse(
    Buffer.from(parts[1], 'base64url').toString('utf8'),
  ) as { merchant_uuid?: string };

  const id = payload.merchant_uuid;

  if (!id || typeof id !== 'string') {
    throw new Error('Clover access JWT missing merchant_uuid claim');
  }

  return id;
}
