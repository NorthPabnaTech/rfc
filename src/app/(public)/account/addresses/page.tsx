import type { Metadata } from 'next';

import { listAddresses } from '@/services/users';
import { requireUserPage } from '@lib/auth/current-user';

import { AddressBook } from './components/address-book';

export const metadata: Metadata = { title: 'My addresses' };

export default async function AddressesPage() {
  const user = await requireUserPage('/account/addresses');
  const addresses = await listAddresses(user.id);
  return <AddressBook addresses={addresses} />;
}
