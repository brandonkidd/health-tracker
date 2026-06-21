export const AUTH_COOKIE = 'brandon_fit_auth';
const SESSION_MESSAGE = 'brandon-fit-session';

export function isAuthConfigured(): boolean {
  return Boolean(process.env.SITE_PASSWORD && process.env.AUTH_SECRET);
}

async function signSession(secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(SESSION_MESSAGE)
  );
  return Buffer.from(signature).toString('base64url');
}

export async function createAuthToken(): Promise<string | null> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;
  return signSession(secret);
}

export async function isValidAuthToken(token: string | undefined): Promise<boolean> {
  if (!token || !process.env.AUTH_SECRET) return false;
  const expected = await signSession(process.env.AUTH_SECRET);
  return timingSafeEqual(token, expected);
}

export function isValidPassword(password: string): boolean {
  const expected = process.env.SITE_PASSWORD;
  if (!expected) return false;
  return timingSafeEqual(password, expected);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
