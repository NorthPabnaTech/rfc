import 'server-only';

import crypto from 'node:crypto';

import { z } from 'zod';

import { hashPassword, verifyPassword } from '@lib/auth/password';
import { AppError } from '@lib/errors';
import { mailLayout, sendMail } from '@lib/mail';
import { BD_PHONE, forgotSchema, loginSchema } from '@lib/validators/reseller';

import { PLATFORM } from '@config/platform';

import { serverT } from '../http';
import { UserModel } from '../models';
import { createSession, deleteSession } from '../session';
import { notify } from './notify';

const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex');
const COLORS = ['#219ebc', '#fb8500', '#023047', '#136780', '#d96f00', '#5fb6d8'];
const CODE_TTL_MS = 30 * 60_000;
const RESET_TTL_MS = 60 * 60_000;

export const registerInput = z.object({
  name: z.string().trim().min(2).max(80),
  shopName: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email(serverT('common.invalidEmail')),
  phone: z.string().trim().regex(BD_PHONE, serverT('common.invalidPhone')),
  district: z.string().trim().min(2),
  password: z.string().min(8, serverT('auth.passwordMin')).max(100),
});
export const loginInput = loginSchema(serverT).pick({ email: true, password: true });
export const emailInput = forgotSchema(serverT);
export const verifyInput = z.object({ email: z.string().trim().toLowerCase().email(), code: z.string().regex(/^\d{6}$/) });
export const resetInput = z.object({ token: z.string().min(20), password: z.string().min(8).max(100) });
export const changePasswordInput = z.object({ current: z.string().min(1), next: z.string().min(8).max(100) });

async function sendVerifyCode(user: { _id: unknown; email: string; name: string }) {
  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  await UserModel.updateOne(
    { _id: user._id },
    { $set: { verifyCodeHash: sha256(code), verifyCodeExpires: new Date(Date.now() + CODE_TTL_MS) } },
  );
  const { text, html } = mailLayout({
    greeting: `Hi ${user.name},`,
    paragraphs: [
      `Your ${PLATFORM.name} verification code is ${code}.`,
      'Enter it on the verification page to activate your seller account. The code expires in 30 minutes.',
    ],
    action: { label: 'Open verification page', url: `${PLATFORM.appUrl}/verify-email?email=${encodeURIComponent(user.email)}` },
    footnote: 'If you did not create an account, you can ignore this email.',
  });
  await sendMail({ to: user.email, subject: `${code} is your ${PLATFORM.name} verification code`, text, html });
}

export async function register(input: z.output<typeof registerInput>) {
  if (await UserModel.exists({ email: input.email })) {
    throw new AppError('An account with this email already exists.', 409);
  }
  const user = await UserModel.create({
    role: 'seller',
    name: input.name,
    email: input.email,
    phone: input.phone,
    shopName: input.shopName,
    district: input.district,
    passwordHash: await hashPassword(input.password),
    status: 'pending',
    emailVerified: false,
    avatarColor: COLORS[crypto.randomInt(0, COLORS.length)],
    payout: { method: 'bkash', account: input.phone },
  });
  await sendVerifyCode(user);
  return { email: user.email };
}

export async function verifyEmail(input: z.output<typeof verifyInput>) {
  const user = await UserModel.findOne({ email: input.email }).select('+verifyCodeHash +verifyCodeExpires');
  const valid =
    user?.verifyCodeHash &&
    user.verifyCodeExpires &&
    user.verifyCodeExpires.getTime() > Date.now() &&
    crypto.timingSafeEqual(Buffer.from(user.verifyCodeHash), Buffer.from(sha256(input.code)));
  if (!user || !valid) throw new AppError('The code is invalid or has expired.', 422);
  user.emailVerified = true;
  user.verifyCodeHash = undefined;
  user.verifyCodeExpires = undefined;
  await user.save();
  await notify({ audience: 'admin', kind: 'account', title: 'New seller registration', body: `${user.name} (${user.shopName}) is waiting for approval.`, href: `/admin/sellers/${user._id}` });
  return { status: user.status };
}

export async function resendCode(email: string) {
  const user = await UserModel.findOne({ email, role: 'seller' }).select('+verifyCodeExpires');
  // Same response whether or not the account exists; throttle to one code per minute.
  if (!user || user.emailVerified) return;
  const issuedAt = (user.verifyCodeExpires?.getTime() ?? 0) - CODE_TTL_MS;
  if (Date.now() - issuedAt < 60_000) throw new AppError('Please wait a minute before requesting another code.', 429);
  await sendVerifyCode(user);
}

export async function login(input: z.output<typeof loginInput>) {
  const user = await UserModel.findOne({ email: input.email.toLowerCase() }).select('+passwordHash').lean();
  const passwordOk = await verifyPassword(input.password, user?.passwordHash);
  if (!user || !passwordOk) throw new AppError('Incorrect email or password.', 401);
  if (user.role === 'seller' && !user.emailVerified) {
    throw new AppError('Please verify your email first. Check your inbox for the code.', 403);
  }
  if (user.status === 'suspended') throw new AppError('This account is suspended. Contact support.', 403);
  if (user.status === 'inactive') throw new AppError('This account is inactive. Contact support.', 403);
  if (user.status === 'pending') throw new AppError('Your seller account is awaiting admin approval.', 403);
  await createSession({ id: String(user._id), role: user.role });
  return { id: String(user._id), role: user.role, name: user.name, email: user.email };
}

export const logout = deleteSession;

export async function forgotPassword(email: string) {
  const user = await UserModel.findOne({ email: email.toLowerCase() }).lean();
  if (!user) return; // never reveal whether an email is registered
  const token = crypto.randomBytes(32).toString('base64url');
  await UserModel.updateOne(
    { _id: user._id },
    { $set: { resetTokenHash: sha256(token), resetExpires: new Date(Date.now() + RESET_TTL_MS) } },
  );
  const { text, html } = mailLayout({
    greeting: `Hi ${user.name},`,
    paragraphs: ['We received a request to reset your password.', 'This link expires in 1 hour.'],
    action: { label: 'Reset password', url: `${PLATFORM.appUrl}/reset-password?token=${token}` },
    footnote: 'If you did not ask for this, you can ignore this email — your password stays the same.',
  });
  await sendMail({ to: user.email, subject: `Reset your ${PLATFORM.name} password`, text, html });
}

export async function resetPassword(input: z.output<typeof resetInput>) {
  const user = await UserModel.findOne({
    resetTokenHash: sha256(input.token),
    resetExpires: { $gt: new Date() },
  }).select('+resetTokenHash +resetExpires');
  if (!user) throw new AppError('This reset link is invalid or has expired.', 422);
  user.passwordHash = await hashPassword(input.password);
  user.resetTokenHash = undefined;
  user.resetExpires = undefined;
  await user.save();
}

export async function changePassword(userId: string, input: z.output<typeof changePasswordInput>) {
  const user = await UserModel.findById(userId).select('+passwordHash');
  if (!user || !(await verifyPassword(input.current, user.passwordHash))) {
    throw new AppError('Your current password is incorrect.', 422);
  }
  user.passwordHash = await hashPassword(input.next);
  await user.save();
}
