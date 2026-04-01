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
  if (sessionPayload != null) return await onAppSessionPresent(merchantId || '', sessionPayload);

  /**
   * SCENARIO 3: No `code`, no app session — cold start (dashboard launch, direct browse, or odd params).
   * Clover: direct visits should go through OAuth, starting the flow from the beginning
   */
  return CL_ROUTES.OAUTH_CALLBACK;
};

/**
 * Handles the case where there is already a valid app session.
 *
 * @param merchantId - The merchant ID from the query string.
 * @param sessionPayload - The session payload from the database.
 *
 * @returns The URL to redirect to after successful app session check.
 */
async function onAppSessionPresent(merchantId: string, sessionPayload: UserJwtPayload): Promise<string> {
  // SPECIAL CASE1: If merchantId param is missing, but session already exists, return to dashboard
  if (!merchantId) return CL_ROUTES.REPORTS_DASHBOARD;

  // SPECIAL CASE2: If merchantId param is present, but different from in session, switch session to new merchant
  if (merchantId && sessionPayload.cloverMerchantId !== merchantId) {
    // 1. log out
    await SessionModule.clearAppSession();
    // 2. log case, so investigation and incident frequency/urgency
    // TODO AGENT: Add logging here
    // appLogger.error('App session present but merchantId mismatch', { sessionPayload, merchantId });
    // 3. restart oauth
    return CL_ROUTES.OAUTH_CALLBACK
  }

  // NORMAL CASE: If merchant Id is the same as the session payload, return dashboard
  return CL_ROUTES.REPORTS_DASHBOARD;
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
  // Should never happen, but if state is empty, complete-clover will redirect to clover-callback torestart the flow
  sParams.set('state', state);

  return `${CL_ROUTES.COMPLETE_CLOVER}?${sParams.toString()}`;
}
