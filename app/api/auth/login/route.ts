import { NextRequest, NextResponse } from 'next/server';
import {
  AUTH_COOKIE,
  createAuthToken,
  isAuthConfigured,
  isValidPassword,
} from '@/lib/auth';

export async function POST(request: NextRequest) {
  if (!isAuthConfigured()) {
    return NextResponse.json(
      { success: false, error: 'Site password is not configured' },
      { status: 503 }
    );
  }

  const body = await request.json();
  const password = typeof body.password === 'string' ? body.password : '';

  if (!isValidPassword(password)) {
    return NextResponse.json(
      { success: false, error: 'Incorrect password' },
      { status: 401 }
    );
  }

  const token = await createAuthToken();
  if (!token) {
    return NextResponse.json(
      { success: false, error: 'Authentication is not configured' },
      { status: 503 }
    );
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}
