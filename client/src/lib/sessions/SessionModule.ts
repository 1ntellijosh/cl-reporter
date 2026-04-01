/**
 * App-session JWT helpers for the Next.js app (server: Route Handlers, Server Components, Server Actions).
 * Minting and `Set-Cookie` for the access JWT run on the **Next.js server** after OAuth code exchange
 * (`docs/authorization-flow.md` §3, §6.1). Clover OAuth tokens remain in **oauth-api** / DB only.
 *
 * Clover OAuth tokens are separate; do not use {@link encryptCloverToken} for these JWTs—they are signed with
 * `JWT_SIGNING_KEY`, not AES-GCM–encrypted for DB storage.
 *
 * @since app-login--JP
 */
import type { UserJwtPayload } from '@reporter/common';
import {
  APP_BILLING_STATUS_COOKIE_NAME,
  APP_SESSION_ACCESS_COOKIE_NAME,
  getAppSessionAccessTtlSeconds,
  parseBearerAuthorization,
  signAppSessionAccessToken,
  verifyBearerAccessToken,
} from '@reporter/common';
import { cookies } from 'next/headers';

/**
 * Returns the signing key from the environment (Next.js server only).
 *
 * @throws Error if `JWT_SIGNING_KEY` is unset.
 */
function requireJwtSigningKey(): string {
  const key = process.env.JWT_SIGNING_KEY;

  if (!key) {
    throw new Error('JWT_SIGNING_KEY is not set');
  }

  return key;
}

export class SessionModule {
  /**
   * Mints a short-lived HS256 access JWT for the Clover merchant
   *
   * @param cloverMerchantId - Clover merchant id (`mId`)
   *
   * @returns {string} The signed app session JWT
   */
  static mintAppSessionJwt(cloverMerchantId: string): string {
    return signAppSessionAccessToken(requireJwtSigningKey(), cloverMerchantId);
  }

  /**
   * Stores the access JWT in an **HttpOnly** cookie (also `Secure` in production, `SameSite=Lax`, path `/`,
   *
   * @param accessTokenJwt - The signed app session JWT
   *
   * @returns {Promise<void>}
   */
  static async setAppSessionCookie(accessTokenJwt: string): Promise<void> {
    const cookieStore = await cookies();
    const maxAge = getAppSessionAccessTtlSeconds();

    cookieStore.set(APP_SESSION_ACCESS_COOKIE_NAME, accessTokenJwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge,
    });
  }

  /**
   * Sets a **non-HttpOnly** cookie so client JS can seed subscription UI after OAuth. Server must still enforce paid routes.
   */
  static async setBillingStatusCookie(billingStatus: string): Promise<void> {
    const cookieStore = await cookies();
    const maxAge = getAppSessionAccessTtlSeconds();

    cookieStore.set(APP_BILLING_STATUS_COOKIE_NAME, billingStatus, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge,
    });
  }

  /**
   * Clears the app session by deleting the access token cookie and billing hint cookie.
   *
   * @returns {Promise<void>}
   */
  static async clearAppSession(): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.delete({ name: APP_SESSION_ACCESS_COOKIE_NAME, path: '/' });
    cookieStore.delete({ name: APP_BILLING_STATUS_COOKIE_NAME, path: '/' });
  }

  /**
   * Reads `Authorization: Bearer <jwt>` and returns the verified payload, or null if missing/invalid.
   * Use from Route Handlers with `headers().get('authorization')` or `request.headers.get('authorization')`.
   *
   * @param authorizationHeader - Raw `Authorization` header value.
   */
  static extractPayloadFromBearerJwt(
    authorizationHeader: string | null | undefined,
  ): UserJwtPayload | null {
    const token = parseBearerAuthorization(authorizationHeader ?? null);

    if (!token) return null;

    try {
      return verifyBearerAccessToken(token, requireJwtSigningKey());
    } catch {
      return null;
    }
  }

  /**
   * Checks if the app session is valid by verifying the access token cookie.
   *
   * @returns {Promise<UserJwtPayload | null>} The app session payload, or null if the app session is invalid.
   */
  static async getAppSessionPayload(): Promise<UserJwtPayload | null> {
    const cookieStore = await cookies();
    const accessCookie = cookieStore.get(APP_SESSION_ACCESS_COOKIE_NAME)?.value;
    const token = accessCookie ? decodeURIComponent(accessCookie) : undefined;

    return this.verifyAccessTokenString(token);
  }

  /**
   * Verifies a raw JWT string (e.g. from {@link APP_SESSION_ACCESS_COOKIE_NAME}). Does not require a `Bearer ` prefix.
   *
   * @param token - Full JWT or undefined when cookie is missing.
   */
  static verifyAccessTokenString(token: string | undefined): UserJwtPayload | null {
    if (!token?.trim()) {
      return null;
    }

    try {
      return verifyBearerAccessToken(token.trim(), requireJwtSigningKey());
    } catch {
      return null;
    }
  }

  /**
   * Returns the bearer token string from Web `Headers` or Node `IncomingHttpHeaders` (lowercase keys in Node).
   *
   * @param headers - `headers()` from `next/headers` or `request.headers` in a Route Handler.
   */
  static getBearerTokenFromHeaders(headers: Headers): string | null;
  static getBearerTokenFromHeaders(headers: { authorization?: string }): string | null;
  static getBearerTokenFromHeaders(
    headers: Headers | { authorization?: string },
  ): string | null {
    let raw: string | null | undefined;

    if ('get' in headers && typeof headers.get === 'function') {
      raw = headers.get('authorization') ?? headers.get('Authorization');

      return parseBearerAuthorization(raw ?? null);
    }

    raw = (headers as { authorization?: string }).authorization;

    return parseBearerAuthorization(raw ?? null);
  }
}
