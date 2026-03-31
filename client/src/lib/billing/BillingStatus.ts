/**
 * Client-readable billing hint cookie (`APP_BILLING_STATUS_COOKIE_NAME`) — UI only, not authorization.
 *
 * @since app-login--JP
 */
import { APP_BILLING_STATUS_COOKIE_NAME } from '@reporter/common';
import type { BillingStatus } from '@reporter/common';

const ALLOWED = new Set<string>(['ACTIVE', 'INACTIVE', 'TRIAL']);

/**
 * Maps a raw cookie or API string to a known billing status, or null if missing/invalid.
 */
export function normalizeBillingStatus(raw: string | undefined | null): BillingStatus {
  if (raw == null || raw === '') return null;

  if (!ALLOWED.has(raw)) return null;

  return raw as BillingStatus;
}

/**
 * Reads the billing hint from `document.cookie` (browser only). Prefer server `cookies()` on first paint to avoid hydration mismatch.
 */
export function parseBillingStatusFromDocumentCookie(): BillingStatus {
  if (typeof document === 'undefined') {
    return null;
  }

  const prefix = `${APP_BILLING_STATUS_COOKIE_NAME}=`;
  const parts = document.cookie.split('; ');

  for (const part of parts) {
    if (!part.startsWith(prefix)) continue;

    let value = part.slice(prefix.length);

    try {
      value = decodeURIComponent(value);
    } catch {
      /* use raw */
    }

    return normalizeBillingStatus(value);
  }

  return null;
}
