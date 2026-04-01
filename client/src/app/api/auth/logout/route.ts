/**
 * Logout route for the client app
 *
 * @since app-login--JP
 */
import { NextRequest, NextResponse } from 'next/server';
import { SessionModule } from '../../../../lib/sessions/SessionModule';

export async function POST(request: NextRequest) {
  await SessionModule.clearAppSession();

  return NextResponse.json({ message: 'Logged out successfully' }, { status: 200 });
}
