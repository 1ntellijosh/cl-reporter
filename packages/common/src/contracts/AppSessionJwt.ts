/**
 * Claims for our first-party app-session JWT (distinct from Clover OAuth tokens).
 *
 * @since app-login--JP
 */

/**
 * Verified payload after `jwt.verify` of our access JWT.
 */
export interface UserJwtPayload {
  // Clover merchant id (`mId`).
  cloverMerchantId: string;
  // Unique token id for revocation / denylist (authorization-flow §6.1).
  jti?: string;
  // Unix seconds when app-session JWT expires (our policy, not Clover’s).
  exp: number;
  // Unix seconds when app-session JWT was issued (our policy, not Clover’s).
  iat: number;
}
