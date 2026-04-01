/**
 * Names for app-session transport (cookies, etc.). Keep in sync with client code that sets cookies.
 *
 * @since app-login--JP
 */

/** HttpOnly cookie holding the HS256 app access JWT (Next server sets it; `SessionModule` verifies). */
export const APP_SESSION_ACCESS_COOKIE_NAME = 'cl_reporter_app_access';

/** HttpOnly cookie storing the OAuth `state` sent to Clover before redirect to `/oauth/v2/authorize`. */
export const OAUTH_STATE_COOKIE_NAME = 'cl_reporter_oauth_state';

/**
 * Client-readable billing hint after OAuth (`ACTIVE` | `INACTIVE` | `TRIAL`). For UI only — not authorization.
 * Clear on logout with the app-session cookie.
 */
export const APP_BILLING_STATUS_COOKIE_NAME = 'cl_reporter_billing_status';
