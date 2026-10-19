import 'server-only';

import bcrypt from 'bcryptjs';

const ROUNDS = 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

let dummyHash: Promise<string> | null = null;

/**
 * Compares against `hash`, or — when there is no account — against a dummy
 * hash of the same cost, so a login attempt takes the same time whether or
 * not the email exists.
 */
export async function verifyPassword(plain: string, hash: string | undefined): Promise<boolean> {
  if (!hash) {
    dummyHash ??= bcrypt.hash('rfc-gadget-dummy-password', ROUNDS);
    await bcrypt.compare(plain, await dummyHash);
    return false;
  }
  return bcrypt.compare(plain, hash);
}
