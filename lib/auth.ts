export const AUTH_COOKIE = 'brandon_fit_auth';
export const OAUTH_STATE_COOKIE = 'brandon_fit_oauth_state';
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const SESSION_MESSAGE = 'brandon-fit-session';

export function isAuthConfigured(): boolean {
  return Boolean(process.env.SITE_PASSWORD && process.env.AUTH_SECRET);
}

async function signSession(secret: string, expiresAt: number): Promise<string> {
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
    new TextEncoder().encode(`${SESSION_MESSAGE}:${expiresAt}`)
  );
  return Buffer.from(signature).toString('base64url');
}

/**
 * Session token: "<unix expiry>.<HMAC(message:expiry)>". The signed expiry
 * means a leaked cookie stops working after the session window instead of
 * being valid forever.
 */
export async function createAuthToken(): Promise<string | null> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS;
  return `${expiresAt}.${await signSession(secret, expiresAt)}`;
}

export async function isValidAuthToken(token: string | undefined): Promise<boolean> {
  if (!token || !process.env.AUTH_SECRET) return false;
  const [expiryPart, signature] = token.split('.');
  if (!expiryPart || !signature) return false;
  const expiresAt = Number(expiryPart);
  if (!Number.isInteger(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) return false;
  const expected = await signSession(process.env.AUTH_SECRET, expiresAt);
  return timingSafeEqual(signature, expected);
}

/** Constant-time check for bearer tokens (e.g. LOG_API_TOKEN). */
export function isValidBearerToken(
  provided: string | undefined,
  expected: string | undefined
): boolean {
  if (!provided || !expected) return false;
  return timingSafeEqual(provided, expected);
}

/** Google sign-in is only enabled when credentials AND an email allowlist exist. */
export function isGoogleConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.AUTH_SECRET &&
      allowedGoogleEmails().length > 0
  );
}

export function allowedGoogleEmails(): string[] {
  return (process.env.ALLOWED_GOOGLE_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowedGoogleEmail(email: string): boolean {
  return allowedGoogleEmails().includes(email.trim().toLowerCase());
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
