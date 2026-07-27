import { NextRequest, NextResponse } from 'next/server';
import { isGoogleConfigured, OAUTH_STATE_COOKIE } from '@/lib/auth';

function requestOrigin(request: NextRequest): string {
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  const proto =
    request.headers.get('x-forwarded-proto') ?? request.nextUrl.protocol.replace(':', '');
  return `${proto}://${host}`;
}

export async function GET(request: NextRequest) {
  const origin = requestOrigin(request);

  if (!isGoogleConfigured()) {
    return NextResponse.redirect(`${origin}/login?error=google-not-configured`);
  }

  const state = crypto.randomUUID();
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: `${origin}/api/auth/google/callback`,
    response_type: 'code',
    scope: 'openid email',
    state,
    prompt: 'select_account',
  });

  const response = NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  );
  response.cookies.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 10,
  });
  return response;
}
