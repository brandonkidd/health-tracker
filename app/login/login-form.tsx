'use client';

import { FormEvent, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const OAUTH_ERRORS: Record<string, string> = {
  'not-allowed': "That Google account isn't authorized for this site.",
  'google-failed': "Google sign-in didn't complete. Please try again.",
  'google-not-configured': "Google sign-in isn't set up yet. Use the password instead.",
};

function GoogleLogo() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.09 3.57-5.16 3.57-8.81Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.93-2.91l-3.87-3c-1.07.72-2.44 1.14-4.06 1.14-3.12 0-5.77-2.11-6.71-4.95H1.29v3.1A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.29 14.28a7.2 7.2 0 0 1 0-4.56v-3.1H1.29a12 12 0 0 0 0 10.76l4-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.34.61 4.58 1.8l3.44-3.44A11.97 11.97 0 0 0 12 0 12 12 0 0 0 1.29 6.62l4 3.1C6.23 6.88 8.88 4.77 12 4.77Z"
      />
    </svg>
  );
}

export function LoginForm({ googleEnabled }: { googleEnabled: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [error, setError] = useState(() => {
    const oauthError = searchParams.get('error');
    return oauthError ? (OAUTH_ERRORS[oauthError] ?? 'Sign-in failed. Try again.') : '';
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Login failed');
        return;
      }

      const from = searchParams.get('from') || '/';
      router.push(from);
      router.refresh();
    } catch {
      setError('Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-shell">
      <div className="login-card">
        <p
          style={{
            color: 'var(--orange)',
            fontSize: '12px',
            fontWeight: 800,
            letterSpacing: '2px',
            textTransform: 'uppercase',
            marginBottom: '8px',
          }}
        >
          Private site
        </p>
        <h1 style={{ fontSize: '36px', marginBottom: '8px' }}>BRANDON.FIT</h1>
        <p style={{ color: 'var(--dim)', marginBottom: '24px' }}>
          {googleEnabled ? 'Sign in to continue.' : 'Enter the site password to continue.'}
        </p>

        {googleEnabled && (
          <>
            <a href="/api/auth/google" className="login-google-button">
              <GoogleLogo />
              Continue with Google
            </a>
            <div className="login-divider">
              <span>or use the password</span>
            </div>
          </>
        )}

        <form onSubmit={handleSubmit}>
          <label
            htmlFor="password"
            style={{
              display: 'block',
              color: 'var(--dim)',
              fontSize: '12px',
              fontWeight: 700,
              letterSpacing: '1px',
              textTransform: 'uppercase',
              marginBottom: '8px',
            }}
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mobile-input"
            autoComplete="current-password"
            required
          />

          {error ? (
            <p style={{ color: '#ff6b6b', marginBottom: '16px', fontSize: '14px' }}>{error}</p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="login-submit"
            style={{ opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Checking...' : 'Enter'}
          </button>
        </form>
      </div>
    </div>
  );
}
