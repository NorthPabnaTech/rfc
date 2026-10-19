import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getProfile } from '@/services/users';
import { requireUserPage } from '@lib/auth/current-user';

import { PasswordForm } from './components/password-form';
import { ProfileForm } from './components/profile-form';

export const metadata: Metadata = { title: 'My account' };

export default async function AccountPage() {
  const user = await requireUserPage('/account');
  const profile = await getProfile(user.id);
  if (!profile) notFound();

  return (
    <div className="space-y-8">
      <section className="border-line rounded-3xl border bg-white p-6 sm:p-8">
        <h2 className="text-ink text-lg font-semibold">Profile</h2>
        <p className="text-muted mt-1 text-sm">Your name, phone number and photo.</p>
        <ProfileForm profile={profile} />
      </section>
      <section className="border-line rounded-3xl border bg-white p-6 sm:p-8">
        <h2 className="text-ink text-lg font-semibold">Change password</h2>
        <PasswordForm />
      </section>
    </div>
  );
}
