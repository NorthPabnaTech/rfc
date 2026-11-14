import { NextResponse } from 'next/server';

import { verifyEmailToken } from '@/services/users';
import { createSession } from '@lib/auth/session';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token')?.trim();

  if (!token) {
    return NextResponse.redirect(new URL('/verify-email?status=invalid', request.url));
  }

  const user = await verifyEmailToken(token);
  if (!user) {
    return NextResponse.redirect(new URL('/verify-email?status=invalid', request.url));
  }

  await createSession(user);
  const target = user.role === 'admin' ? '/admin' : '/account?verified=1';
  return NextResponse.redirect(new URL(target, request.url));
}
