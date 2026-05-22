/**
 * OAuth callback completion: exchange code (oauth-api), mint app access JWT, `Set-Cookie` (HttpOnly per §6.1).
 * Implemented as a Route Handler because Next.js only allows mutating cookies in Route Handlers or Server Actions
 * (`docs/authorization-flow.md` §3–4).
 *
 * @since app-login--JP
 */
import type { OAuthExchangeCodeResponse } from '@reporter/common';
import { API, OAUTH_STATE_COOKIE_NAME } from '@reporter/common';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionModule } from '../../../../lib/sessions/SessionModule';
import { CL_ROUTES } from '../../../../lib/enums/ClientRoutes';

/**
 * Redirects to the given pathname on the origin of the CLOVER_REDIRECT_URI.
 * @param request 
 * @param pathname 
 *
 * @returns {NextResponse}
 */
function redirectToPath(request: NextRequest, pathname: string): NextResponse {
  const redirectUri = process.env.CLOVER_REDIRECT_URI!.trim();

  const origin = new URL(redirectUri).origin;

  return NextResponse.redirect(new URL(pathname, `${origin}/`));
}

/**
 * Checks if the request state matches the stored state.
 *
 * @param requestState - The state from the request.
 *
 * @returns {Promise<boolean>}
 */
async function checkRequestStateMatchesStoredState(cookieStore: any, requestState: string): Promise<boolean> {
  const storedState = cookieStore.get(OAUTH_STATE_COOKIE_NAME)?.value;

  return Boolean(requestState) && Boolean(storedState) && storedState === requestState;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state') ?? '';

  if (!code?.trim()) {
    return redirectToPath(request, CL_ROUTES.API_OAUTH_CALLBACK);
  }

  const cookieStore = await cookies();
  const stateOk = await checkRequestStateMatchesStoredState(cookieStore, state);

  /**
   * If the request state does not match the stored state, redirect to the OAuth callback.
   */
  if (!stateOk) {
    return redirectToPath(request, CL_ROUTES.API_OAUTH_CALLBACK);
  }

  const host = request.headers.get('host') ?? '';
  const cookieHeader = request.headers.get('cookie') ?? '';

  try {
    const tokenExchange = await API.auth.exchangeCloverCode(
      {
        code: code.trim(),
        redirectUri: process.env.CLOVER_REDIRECT_URI || '',
      },
      { headers: { Cookie: cookieHeader, Host: host } },
    ) as OAuthExchangeCodeResponse;

    const token = SessionModule.mintAppSessionJwt(tokenExchange.cloverMerchantId);
    await SessionModule.setAppSessionCookie(token);
    await SessionModule.setBillingStatusCookie(tokenExchange.billingStatus);
    cookieStore.delete(OAUTH_STATE_COOKIE_NAME);

    return redirectToPath(request, CL_ROUTES.REPORTS_DASHBOARD);
  } catch (error) {
    // TODO AGENT: Add logging here
    // appLogger.error('complete-clover: exchange or session failed', error);
    console.error('complete-clover: exchange or session failed');

    return redirectToPath(request, CL_ROUTES.ERROR);
  }
}
