import { NextRequest, NextResponse } from 'next/server';
import {
  AUTH_COOKIE,
  OAUTH_STATE_COOKIE,
  createAuthToken,
  isAllowedGoogleEmail,
  isGoogleConfigured,
} from '@/lib/auth';

function requestOrigin(request: NextRequest): string {
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  const proto =
    request.headers.get('x-forwarded-proto') ?? request.nextUrl.protocol.replace(':', '');
  return `${proto}://${host}`;
}

function loginRedirect(origin: string, error: string): NextResponse {
  const response = NextResponse.redirect(`${origin}/login?error=${error}`);
  response.cookies.delete(OAUTH_STATE_COOKIE);
  return response;
}

export async function GET(request: NextRequest) {
  const origin = requestOrigin(request);

  if (!isGoogleConfigured()) {
    return loginRedirect(origin, 'google-not-configured');
  }

  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');
  const expectedState = request.cookies.get(OAUTH_STATE_COOKIE)?.value;
  if (!code || !state || !expectedState || state !== expectedState) {
    return loginRedirect(origin, 'google-failed');
  }

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${origin}/api/auth/google/callback`,
      grant_type: 'authorization_code',
    }),
  });
  if (!tokenResponse.ok) {
    return loginRedirect(origin, 'google-failed');
  }

  // The id_token arrives directly from Google over TLS, so decoding its
  // payload without re-verifying the signature is safe per the OIDC spec.
  const { id_token: idToken } = (await tokenResponse.json()) as { id_token?: string };
  const payloadSegment = idToken?.split('.')[1];
  if (!payloadSegment) {
    return loginRedirect(origin, 'google-failed');
  }
  const payload = JSON.parse(Buffer.from(payloadSegment, 'base64url').toString()) as {
    email?: string;
    email_verified?: boolean;
  };

  if (!payload.email || !payload.email_verified || !isAllowedGoogleEmail(payload.email)) {
    return loginRedirect(origin, 'not-allowed');
  }

  const token = await createAuthToken();
  if (!token) {
    return loginRedirect(origin, 'google-failed');
  }

  const response = NextResponse.redirect(`${origin}/`);
  response.cookies.delete(OAUTH_STATE_COOKIE);
  response.cookies.set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
