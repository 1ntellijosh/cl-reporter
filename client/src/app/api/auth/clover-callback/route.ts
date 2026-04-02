/**
 * Starts the Clover OAuth authorization-code flow: sets a short-lived HttpOnly cookie with `state`,
 * then redirects the browser to Clover’s `/oauth/v2/authorize`.
 *
 * @see docs/clover-developer-setup.md — authorize URL shape
 * @since app-login--JP
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { OAUTH_STATE_COOKIE_NAME } from '@reporter/common';
import { CL_ROUTES } from '../../../../lib/enums/ClientRoutes';

/**
 * Builds the Clover authorize URL and returns a redirect response with `state` stored in a cookie.
 */
export function GET(request: NextRequest): NextResponse {
  const clientId = process.env.CLOVER_CLIENT_ID;
  const authorizeBase = process.env.CLOVER_OAUTH_AUTHORIZE_BASE;
  const redirectUri = process.env.CLOVER_REDIRECT_URI;

  if (!clientId || !authorizeBase || !redirectUri) {
    // TODO AGENT: Add logging here
    // appLogger.error('One or more OAuth env vars are not configured (client ID, authorize base, or redirect URI)');
    return NextResponse.redirect(new URL(CL_ROUTES.ERROR, request.url));
  }

  const state = crypto.randomUUID();
  const authorizeUrl = new URL('/oauth/v2/authorize', authorizeBase);
  authorizeUrl.searchParams.set('client_id', clientId);
  authorizeUrl.searchParams.set('redirect_uri', redirectUri);
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('state', state);

  const response = NextResponse.redirect(authorizeUrl.toString());

  response.cookies.set({
    name: OAUTH_STATE_COOKIE_NAME,
    value: state,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  });

  return response;
}
