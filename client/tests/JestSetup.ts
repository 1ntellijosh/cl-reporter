/**
 * Jest setup for unit tests in client
 *
 * @since app-login--JP
 */

export const OAUTH_ENV_KEYS = ['CLOVER_CLIENT_ID', 'CLOVER_OAUTH_AUTHORIZE_BASE', 'CLOVER_REDIRECT_URI'] as const;

export type OAuthEnvKey = (typeof OAUTH_ENV_KEYS)[number];

export let savedOAuthEnv: Record<OAuthEnvKey, string | undefined>;

export function stashOAuthEnv(): void {
  savedOAuthEnv = {} as Record<OAuthEnvKey, string | undefined>;
  for (const key of OAUTH_ENV_KEYS) {
    savedOAuthEnv[key] = process.env[key];
  }
}

export function restoreOAuthEnv(): void {
  for (const key of OAUTH_ENV_KEYS) {
    const v = savedOAuthEnv[key];
    if (v === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = v;
    }
  }
}

export function setValidOAuthEnv(): void {
  process.env.CLOVER_CLIENT_ID = 'test-client-id';
  process.env.CLOVER_OAUTH_AUTHORIZE_BASE = 'https://apisandbox.dev.clover.com';
  process.env.CLOVER_REDIRECT_URI = 'https://app.example.com/api/auth/complete-clover';
}