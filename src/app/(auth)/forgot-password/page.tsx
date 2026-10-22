import type { Metadata } from 'next';
import Link from 'next/link';

import { ForgotPasswordForm } from './components/forgot-password-form';

export const metadata: Metadata = { title: 'Forgot password', robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="type-display text-ink">Forgot password?</h1>
      <p className="text-muted mt-2 text-sm">
        Enter your account&apos;s email and we&apos;ll send you a link to set a new password.
      </p>
      <ForgotPasswordForm />
      <p className="text-muted mt-8 text-center text-sm">
        Remembered it?{' '}
        <Link href="/login" className="text-ink font-semibold underline-offset-2 hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}
