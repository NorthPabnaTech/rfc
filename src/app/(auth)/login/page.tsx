import type { Metadata } from 'next';

import { LoginView } from './components/login-view';

export const metadata: Metadata = { title: 'Login' };

export default function LoginPage() {
  return <LoginView />;
}
