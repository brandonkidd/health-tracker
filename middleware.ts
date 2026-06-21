import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE, isAuthConfigured, isValidAuthToken } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  if (!isAuthConfigured()) {
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE)?.value;
  if (await isValidAuthToken(token)) {
    return NextResponse.next();
  }

  const loginUrl = new URL('/login', request.url);
  const pathname = request.nextUrl.pathname;
  if (pathname !== '/') {
    loginUrl.searchParams.set('from', pathname);
  }
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)'],
};
