/**
 * Helper functions for integration tests
 *
 * @since setup-tests--JP
 */

import { MerchantsRepository } from '@reporter/middleware';

export const cloverMerchantId = '1234567890';
export const refreshToken = 'valid-refresh-token';
export const refreshTokenExpiration = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365;
export const accessToken = 'valid-access-token';
export const accessTokenExpiration = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365;
export const ENCRYPTION_KEY = 'a1aba6fd22734dd56c7675e1c797dca6ecb4d4f709b3b3be070c2c53ce2d6d7f';
export const JWT_SIGNING_KEY = 'test-key';

export function setEnvVars() {
  process.env.JWT_SIGNING_KEY = JWT_SIGNING_KEY;
  process.env.CLOVER_TOKEN_ENCRYPTION_KEY = ENCRYPTION_KEY;
  // Avoid Invalid URL if refresh path runs; integration tests should not hit the network.
  process.env.CLOVER_OAUTH_TOKEN_BASE ??= 'https://apisandbox.dev.clover.com';
  process.env.CLOVER_CLIENT_ID ??= 'test-client-id';
}

export async function seedMerchantsRepository() {
  await MerchantsRepository.storeRefreshTokenData(cloverMerchantId, refreshToken, refreshTokenExpiration);
  await MerchantsRepository.storeAccessTokenData(cloverMerchantId, accessToken, accessTokenExpiration);
}

/**
 * Minimal JWT-shaped string whose payload matches Clover access tokens (`merchant_uuid`).
 * {@link parseCloverMerchantIdFromAccessJwt} only decodes the payload; it does not verify the signature.
 */
export function makeCloverJwtTokenString(merchantUuid: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ merchant_uuid: merchantUuid })).toString('base64url');

  return `${header}.${payload}.sig`;
}