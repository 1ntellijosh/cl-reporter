/**
 * Handles the start page logic for user OAuth and session authentication.
 *
 * @since app-login--JP
 */
import type { UserJwtPayload } from '@reporter/common';
import { SessionModule } from '../../lib/sessions/SessionModule';
import { CL_ROUTES } from '../enums/ClientRoutes';

/**
 * Handles the start page logic
 */
type StartSearchParams = {
  merchant_id?: string;
  merchantId?: string;
  client_id?: string;
  code?: string;
  state?: string;
};

export const handleStartPage = async (params: StartSearchParams): Promise<string> => {
  const merchantId = params.merchant_id ?? params.merchantId;
  const clientId = params.client_id;
  const code = params.code;
  const stateFromQuery = params.state;

  /**
   * SCENARIO 1: OAuth callback: Clover returned `code` + `state` (authorization-flow §3, §3.1).
   */
  if (code?.trim()) return onCodeProvided(code!.trim(), stateFromQuery || '');

  /**
   * SCENARIO 2: There is already a valid app session (§8 step 1 — “need our session?” is satisfied). Skip OAuth
   * - If Clover puts `merchant_id` in the URL, it must match the JWT tenant (avoids cross-merchant confusion).
   */
  const sessionPayload = await SessionModule.getAppSessionPayload();
  if (sessionPayload != null) return onAppSessionPresent(merchantId || '', sessionPayload);

  /**
   * SCENARIO 3: Initial redirect from Clover dashboard to app
   * - If `client_id` is present it must match our app, and `merchant_id` is required.
   */
  return onInitialStartLoad(clientId || '', merchantId || '');
};

/**
 * Handles the case where there is already a valid app session.
 *
 * @param merchantId - The merchant ID from the query string.
 * @param sessionPayload - The session payload from the database.
 *
 * @returns The URL to redirect to after successful app session check.
 */
function onAppSessionPresent(merchantId: string, sessionPayload: UserJwtPayload): string {
  if (merchantId && sessionPayload.cloverMerchantId !== merchantId) {
    return CL_ROUTES.ERROR;
  }

  return CL_ROUTES.REPORTS_DASHBOARD;
}

/**
 * Handles the case where the start page is loaded with client_id and merchant_id.
 *
 * @param clientId - The client ID from the query string.
 * @param merchantId - The merchant ID from the query string.
 *
 * @returns The URL to redirect to after successful initial start load.
 */
function onInitialStartLoad(clientId: string, merchantId: string): string {
  const expectedClientId = process.env.CLOVER_CLIENT_ID;
  if (clientId != null && clientId !== '') {
    if (expectedClientId == null || clientId !== expectedClientId) {
      return CL_ROUTES.ERROR;
    }

    if (!merchantId) {
      return CL_ROUTES.ERROR;
    }
  }

  // We have client_id and merchant_id, so begin Clover authorize (§3.1, §4 — sets `state` cookie, redirects to Clover).
  return CL_ROUTES.OAUTH_CALLBACK;
}

/**
 * Handles the case where start page is loaded with code param provided.
 *
 * @param code - The code parameter from the query string.
 * @param state - The state parameter from the query string.
 *
 * @returns The URL to redirect to after successful code exchange.
 */
function onCodeProvided(code: string, state: string): string {
  const sParams = new URLSearchParams();
  sParams.set('code', code.trim());
  sParams.set('state', state);

  return `${CL_ROUTES.COMPLETE_CLOVER}?${sParams.toString()}`;
}
