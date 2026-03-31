/**
 * Starts the Clover OAuth authorization-code flow: sets a short-lived HttpOnly cookie with `state`,
 * then redirects the browser to Clover’s `/oauth/v2/authorize`.
 *
 * @see docs/clover-developer-setup.md — authorize URL shape
 * @since app-login--JP
 */

import { NextResponse } from 'next/server';

import { OAUTH_STATE_COOKIE_NAME } from '@reporter/common';

/**
 * Builds the Clover authorize URL and returns a redirect response with `state` stored in a cookie.
 */
export function GET(): NextResponse {
  const clientId = process.env.CLOVER_CLIENT_ID;
  const authorizeBase = process.env.CLOVER_OAUTH_AUTHORIZE_BASE;
  const redirectUri = process.env.CLOVER_REDIRECT_URI;

  if (!clientId || !authorizeBase || !redirectUri) {
    return NextResponse.json({ error: 'OAuth is not configured' }, { status: 503 });
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

