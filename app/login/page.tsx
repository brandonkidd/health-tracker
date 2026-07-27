import { Suspense } from 'react';
import { isGoogleConfigured } from '@/lib/auth';
import { LoginForm } from './login-form';
import '../globals.css';

// Read the Google config at request time, not build time.
export const dynamic = 'force-dynamic';

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--dim)',
          }}
        >
          Loading...
        </div>
      }
    >
      <LoginForm googleEnabled={isGoogleConfigured()} />
    </Suspense>
  );
}
