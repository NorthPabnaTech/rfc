import 'server-only';

import { createHash, randomBytes } from 'node:crypto';

import { SITE } from '@/config/site';
import { AddressModel, connectDB, OrderModel, UserModel } from '@/database';
import type { AddressDTO, CustomerRowDTO, Paginated, ProfileDTO } from '@/types';
import { hashPassword, verifyPassword } from '@lib/auth/password';
import { deleteImages, isOwnCloudinaryAsset } from '@lib/cloudinary';
import {
  ADMIN_PAGE_SIZE,
  EMAIL_VERIFICATION_TTL_HOURS,
  PASSWORD_RESET_COOLDOWN_SECONDS,
  PASSWORD_RESET_TTL_MINUTES,
} from '@lib/constants';
import { AppError } from '@lib/errors';
import { mailLayout, sendMail } from '@lib/mail';
import type {
  AddressOutput,
  LoginIdentifier,
  ProfileOutput,
  RegisterOutput,
  ResetPasswordOutput,
} from '@lib/validators/auth';

import { toAddress, toImage } from './mappers';

/* ─── Auth ───────────────────────────────────────────────────────────────── */

export async function registerCustomer(input: RegisterOutput, origin?: string) {
  await connectDB();
  const email = input.email.trim().toLowerCase();

  if (await UserModel.exists({ phone: input.phone, isEmailVerified: { $ne: false } })) {
    throw new AppError('An account with this mobile number already exists. Try signing in.');
  }
  if (await UserModel.exists({ email, isEmailVerified: { $ne: false } })) {
    throw new AppError('An account with this email already exists. Try signing in.');
  }

  // Unverified registrations can be replaced cleanly so the user can re-register with the same email.
  await UserModel.deleteMany({
    isEmailVerified: false,
    $or: [{ email }, { phone: input.phone }],
  });

  const token = randomBytes(32).toString('base64url');
  const ttlMs = EMAIL_VERIFICATION_TTL_HOURS * 60 * 60_000;
  const user = await UserModel.create({
    name: input.name,
    email,
    phone: input.phone,
    passwordHash: await hashPassword(input.password),
    role: 'customer',
    isEmailVerified: false,
    emailVerificationTokenHash: hashResetToken(token),
    emailVerificationExpiresAt: new Date(Date.now() + ttlMs),
  });

  const baseUrl = (origin || SITE.url).replace(/\/+$/, '');
  const verifyUrl = `${baseUrl}/verify-email?token=${encodeURIComponent(token)}`;
  try {
    await sendMail({
      to: email,
      subject: `Verify your ${SITE.name} account`,
      ...mailLayout({
        greeting: `Hi ${user.name},`,
        paragraphs: [
          `Thanks for creating an account with ${SITE.name}. Click the button below to verify your email address and sign in automatically.`,
          `This verification link expires in ${EMAIL_VERIFICATION_TTL_HOURS} hours.`,
        ],
        action: { label: 'Verify email & sign in', url: verifyUrl },
        footnote:
          "If you didn't create this account, you can safely ignore this email — the account won't be activated.",
      }),
    });
  } catch (error) {
    await UserModel.deleteOne({ _id: user._id }).catch(() => {});
    console.error('[register verification] mail failed', error);
    throw new AppError("We couldn't send the verification email right now. Please try again.");
  }

  return { id: String(user._id), role: user.role, email };
}

export async function verifyEmailToken(token: string) {
  await connectDB();
  const user = await UserModel.findOne({
    emailVerificationTokenHash: hashResetToken(token),
    emailVerificationExpiresAt: { $gt: new Date() },
    isActive: true,
  });
  if (!user) return null;

  user.isEmailVerified = true;
  user.emailVerificationTokenHash = undefined;
  user.emailVerificationExpiresAt = undefined;
  user.lastLoginAt = new Date();
  await user.save();

  if (user.phone && user.email) {
    // Link earlier guest orders only when both the phone AND the (now verified)
    // email match. The phone number itself is never verified, so matching on
    // phone alone would let anyone register with a victim's number and read
    // their orders, address and contact details.
    await OrderModel.updateMany(
      { user: null, 'customer.phone': user.phone, 'customer.email': user.email },
      { $set: { user: user._id } },
    );
  }

  return { id: String(user._id), role: user.role };
}

/** Same message for an unknown account and a wrong password — never reveal which. */
const INVALID_LOGIN = 'Incorrect email / mobile number or password.';

/** Signs in with either an email or a mobile number (see `loginIdentifier`). */
export async function authenticate(identifier: LoginIdentifier, password: string) {
  await connectDB();
  const filter = identifier.email ? { email: identifier.email } : { phone: identifier.phone };
  const user = await UserModel.findOne(filter).select('+passwordHash');
  const ok = await verifyPassword(password, user?.passwordHash);
  if (!user || !ok) throw new AppError(INVALID_LOGIN, 401);
  if (user.isEmailVerified === false) {
    throw new AppError(
      'Please verify your email first. Check your inbox for the verification link, or register again.',
      403,
    );
  }
  if (!user.isActive)
    throw new AppError('This account has been disabled. Please contact support.', 403);
  user.lastLoginAt = new Date();
  await user.save();
  return { id: String(user._id), role: user.role };
}

/* ─── Password reset ─────────────────────────────────────────────────────── */

const hashResetToken = (token: string) => createHash('sha256').update(token).digest('hex');

const INVALID_RESET_LINK = 'This reset link is invalid or has expired. Please request a new one.';

/**
 * Emails a one-time reset link to the account's email address. Silently does
 * nothing for unknown, disabled or email-less accounts, or for a repeat
 * request inside the cooldown — the caller always shows the same message.
 */
export async function requestPasswordReset(email: string, origin?: string): Promise<void> {
  await connectDB();
  const normalizedEmail = email.trim().toLowerCase();
  const user = await UserModel.findOne({ email: normalizedEmail }).select('+passwordResetExpiresAt');
  if (!user?.isActive || !user.email || user.isEmailVerified === false) return;

  const ttlMs = PASSWORD_RESET_TTL_MINUTES * 60_000;
  const lastIssuedAt = (user.passwordResetExpiresAt?.getTime() ?? 0) - ttlMs;
  if (Date.now() - lastIssuedAt < PASSWORD_RESET_COOLDOWN_SECONDS * 1000) return;

  const token = randomBytes(32).toString('base64url');
  user.passwordResetTokenHash = hashResetToken(token);
  user.passwordResetExpiresAt = new Date(Date.now() + ttlMs);
  await user.save();

  const baseUrl = (origin || SITE.url).replace(/\/+$/, '');
  const url = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;
  try {
    await sendMail({
      to: user.email,
      subject: `Reset your ${SITE.name} password`,
      ...mailLayout({
        greeting: `Hi ${user.name},`,
        paragraphs: [
          `We received a request to reset the password for your ${SITE.name} account.`,
          `This link works once and expires in ${PASSWORD_RESET_TTL_MINUTES} minutes.`,
        ],
        action: { label: 'Reset password', url },
        footnote:
          "If you didn't ask for this, you can ignore this email — your password won't change.",
      }),
    });
  } catch (error) {
    console.error('[password reset] mail failed', error);
    throw new AppError("We couldn't send the email right now. Please try again in a few minutes.");
  }
}

/** Whether a reset token is still usable (for rendering the reset page). */
export async function isResetTokenValid(token: string): Promise<boolean> {
  await connectDB();
  return !!(await UserModel.exists({
    passwordResetTokenHash: hashResetToken(token),
    passwordResetExpiresAt: { $gt: new Date() },
    isActive: true,
  }));
}

/** Sets a new password from a reset link, then signs out every other session. */
export async function resetPassword(input: ResetPasswordOutput) {
  await connectDB();
  const user = await UserModel.findOne({
    passwordResetTokenHash: hashResetToken(input.token),
    passwordResetExpiresAt: { $gt: new Date() },
    isActive: true,
  });
  if (!user) throw new AppError(INVALID_RESET_LINK);
  user.passwordHash = await hashPassword(input.password);
  user.passwordChangedAt = new Date();
  user.passwordResetTokenHash = undefined;
  user.passwordResetExpiresAt = undefined;
  await user.save();
  return { id: String(user._id), role: user.role };
}

/* ─── Profile ────────────────────────────────────────────────────────────── */

export async function getProfile(userId: string): Promise<ProfileDTO | null> {
  await connectDB();
  const u = await UserModel.findById(userId).lean();
  if (!u) return null;
  return {
    id: String(u._id),
    name: u.name,
    email: u.email,
    phone: u.phone,
    avatar: toImage(u.avatar),
  };
}

export async function updateProfile(userId: string, input: ProfileOutput) {
  await connectDB();
  if (
    input.avatar &&
    (input.avatar.type !== 'cloudinary' || !isOwnCloudinaryAsset(input.avatar, 'users'))
  ) {
    throw new AppError('Please upload your photo using the upload button.');
  }
  const user = await UserModel.findById(userId);
  if (!user) throw new AppError('Account not found.', 404);
  if (
    input.phone !== user.phone &&
    (await UserModel.exists({ phone: input.phone, _id: { $ne: user._id } }))
  ) {
    throw new AppError('Another account already uses this mobile number.');
  }
  if (user.email && input.email !== user.email) {
    throw new AppError('Email address cannot be changed once set.');
  }
  if (
    !user.email &&
    (await UserModel.exists({ email: input.email, _id: { $ne: user._id } }))
  ) {
    throw new AppError('Another account already uses this email.');
  }
  const oldAvatar = user.avatar;
  user.name = input.name;
  user.phone = input.phone;
  if (!user.email) user.email = input.email;
  if (input.avatar === null) user.set('avatar', undefined);
  else if (input.avatar) user.set('avatar', input.avatar);
  await user.save();
  if (oldAvatar?.publicId && oldAvatar.publicId !== user.avatar?.publicId)
    await deleteImages([oldAvatar]);
}

export async function changePassword(userId: string, current: string, next: string) {
  await connectDB();
  const user = await UserModel.findById(userId).select('+passwordHash');
  if (!user) throw new AppError('Account not found.', 404);
  if (!(await verifyPassword(current, user.passwordHash))) {
    throw new AppError('Your current password is incorrect.');
  }
  user.passwordHash = await hashPassword(next);
  // Signs out every other session (see getCurrentUser); the caller re-issues
  // a fresh session for this device.
  user.passwordChangedAt = new Date();
  await user.save();
  return { id: String(user._id), role: user.role };
}

/* ─── Addresses ──────────────────────────────────────────────────────────── */

export async function listAddresses(userId: string): Promise<AddressDTO[]> {
  await connectDB();
  const docs = await AddressModel.find({ user: userId })
    .sort({ isDefault: -1, updatedAt: -1 })
    .lean();
  return docs.map(toAddress);
}

export async function saveAddress(userId: string, input: AddressOutput, id?: string) {
  await connectDB();
  const count = await AddressModel.countDocuments({ user: userId });
  if (!id && count >= 10) throw new AppError('You can save up to 10 addresses.');
  const isDefault = input.isDefault || count === 0 || (count === 1 && !!id);
  if (isDefault) await AddressModel.updateMany({ user: userId }, { $set: { isDefault: false } });

  if (id) {
    const res = await AddressModel.updateOne(
      { _id: id, user: userId },
      { $set: { ...input, isDefault } },
    );
    if (!res.matchedCount) throw new AppError('Address not found.', 404);
  } else {
    await AddressModel.create({ ...input, isDefault, user: userId });
  }
}

export async function deleteAddress(userId: string, id: string) {
  await connectDB();
  const doc = await AddressModel.findOneAndDelete({ _id: id, user: userId }).lean();
  if (doc?.isDefault) {
    const next = await AddressModel.findOne({ user: userId }).sort({ updatedAt: -1 });
    if (next) {
      next.isDefault = true;
      await next.save();
    }
  }
}

/* ─── Admin: customers ───────────────────────────────────────────────────── */

function computeOrderProfit(o: {
  status: string;
  total: number;
  shippingFee?: number;
  supplierCost?: number;
  refundedAmount?: number;
  returnedItems?: Array<{ supplierPrice: number; quantity: number; lineTotal: number }>;
}): number {
  if (o.status !== 'delivered' && o.status !== 'completed') return 0;
  const returnedCost = (o.returnedItems ?? []).reduce(
    (s, ri) => s + ri.supplierPrice * ri.quantity,
    0,
  );
  const orderRefund = o.refundedAmount && o.refundedAmount > 0 ? o.refundedAmount : 0;
  const netOrderRev = Math.max(0, o.total - orderRefund);
  const netOrderCogs = Math.max(0, (o.supplierCost ?? 0) - returnedCost);
  return netOrderRev - (o.shippingFee ?? 0) - netOrderCogs;
}

export async function listCustomers(f: {
  q?: string;
  status?: 'active' | 'disabled';
  page?: number;
}): Promise<Paginated<CustomerRowDTO>> {
  await connectDB();
  const page = Math.max(1, f.page ?? 1);
  const query: Record<string, unknown> = { role: 'customer' };
  if (f.status === 'active') query.isActive = true;
  if (f.status === 'disabled') query.isActive = false;
  if (f.q) {
    const rx = new RegExp(
      f.q
        .trim()
        .slice(0, 80)
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
      'i',
    );
    query.$or = [{ name: rx }, { email: rx }, { phone: rx }];
  }
  const [docs, total] = await Promise.all([
    UserModel.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * ADMIN_PAGE_SIZE)
      .limit(ADMIN_PAGE_SIZE)
      .lean(),
    UserModel.countDocuments(query),
  ]);
  const customerOrders = await OrderModel.find({
    user: { $in: docs.map((d) => d._id) },
    status: { $nin: ['cancelled'] },
  })
    .select('user status total shippingFee supplierCost refundedAmount returnedItems')
    .lean();

  const byUser = new Map<string, { n: number; spent: number; profit: number }>();
  for (const o of customerOrders) {
    const uid = String(o.user);
    const entry = byUser.get(uid) ?? { n: 0, spent: 0, profit: 0 };
    entry.n += 1;
    entry.spent += o.total;
    entry.profit += computeOrderProfit(o);
    byUser.set(uid, entry);
  }

  return {
    items: docs.map((u) => {
      const s = byUser.get(String(u._id));
      return {
        id: String(u._id),
        name: u.name,
        email: u.email,
        phone: u.phone,
        avatarUrl: u.avatar?.url,
        isActive: u.isActive,
        role: u.role,
        orderCount: s?.n ?? 0,
        totalSpent: s?.spent ?? 0,
        totalProfit: s?.profit ?? 0,
        createdAt: new Date(u.createdAt).toISOString(),
      };
    }),
    total,
    page,
    pageSize: ADMIN_PAGE_SIZE,
    pageCount: Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE)),
  };
}

export async function getCustomerDetail(id: string) {
  await connectDB();
  const u = await UserModel.findById(id).lean();
  if (!u) return null;
  const [addresses, customerOrders] = await Promise.all([
    listAddresses(id),
    OrderModel.find({ user: u._id })
      .select('status total shippingFee supplierCost refundedAmount returnedItems')
      .lean(),
  ]);

  let orderCount = 0;
  let totalSpent = 0;
  let deliveredCount = 0;
  let cancelledCount = 0;
  let returnedCount = 0;
  let totalProfit = 0;

  for (const o of customerOrders) {
    if (o.status === 'cancelled') {
      cancelledCount += 1;
      continue;
    }
    orderCount += 1;
    totalSpent += o.total;
    if (o.status === 'delivered' || o.status === 'completed') deliveredCount += 1;
    if (o.status === 'returned') returnedCount += 1;
    totalProfit += computeOrderProfit(o);
  }

  return {
    id: String(u._id),
    name: u.name,
    email: u.email,
    phone: u.phone,
    avatarUrl: u.avatar?.url,
    isActive: u.isActive,
    createdAt: new Date(u.createdAt).toISOString(),
    lastLoginAt: u.lastLoginAt ? new Date(u.lastLoginAt).toISOString() : undefined,
    addresses,
    orderCount,
    totalOrders: customerOrders.length,
    totalSpent,
    totalProfit,
    deliveredCount,
    cancelledCount,
    returnedCount,
  };
}

export async function getCustomerCounts(): Promise<{
  total: number;
  active: number;
  disabled: number;
}> {
  await connectDB();
  const [active, disabled] = await Promise.all([
    UserModel.countDocuments({ role: 'customer', isActive: true }),
    UserModel.countDocuments({ role: 'customer', isActive: false }),
  ]);
  return { total: active + disabled, active, disabled };
}

export async function setCustomerActive(id: string, isActive: boolean) {
  await connectDB();
  const res = await UserModel.updateOne({ _id: id, role: 'customer' }, { $set: { isActive } });
  if (!res.matchedCount) throw new AppError('Customer not found.', 404);
}

/** For the manual-order form: find an existing customer by name/phone/email. */
export async function searchCustomers(q: string) {
  await connectDB();
  const rx = new RegExp(
    q
      .trim()
      .slice(0, 80)
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
    'i',
  );
  const users = await UserModel.find({
    role: 'customer',
    $or: [{ name: rx }, { email: rx }, { phone: rx }],
  })
    .limit(10)
    .lean();
  const defaults = await AddressModel.find({
    user: { $in: users.map((u) => u._id) },
    isDefault: true,
  }).lean();
  const addrByUser = new Map(defaults.map((a) => [String(a.user), toAddress(a)]));
  return users.map((u) => ({
    id: String(u._id),
    name: u.name,
    email: u.email,
    phone: u.phone,
    defaultAddress: addrByUser.get(String(u._id)) ?? null,
  }));
}
