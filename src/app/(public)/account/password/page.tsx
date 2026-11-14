import type { Metadata } from 'next';

import { requireUserPage } from '@lib/auth/current-user';

import { PasswordForm } from '../components/password-form';

export const metadata: Metadata = { title: 'Change password' };

export default async function AccountPasswordPage() {
  await requireUserPage('/account/password');

  return (
    <section className="border-line rounded-3xl border bg-white p-6 sm:p-8">
      <h2 className="text-ink text-lg font-semibold">Change password</h2>
      <p className="text-muted mt-1 text-sm">Update your account password to keep it secure.</p>
      <PasswordForm />
    </section>
  );
}
