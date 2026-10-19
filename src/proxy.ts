import { type NextRequest, NextResponse } from 'next/server';

import { SESSION_COOKIE, sessionKey, verifySessionToken } from '@lib/auth/token';

/**
 * Optimistic route protection: bounce visitors without a valid session
 * cookie before rendering. This is only a fast first gate — every protected
 * page and every server action re-verifies the user against the database
 * (see lib/auth/current-user.ts).
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const secret = process.env.AUTH_SECRET;
  const session = secret
    ? await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value, sessionKey(secret))
    : null;

  if (!session) {
    const url = new URL('/login', request.url);
    url.searchParams.set('next', pathname + search);
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith('/admin') && session.role !== 'admin') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/account/:path*'],
};
