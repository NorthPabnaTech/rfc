import 'server-only';

import { AddressModel, connectDB, OrderModel, UserModel } from '@/database';
import type { AddressDTO, CustomerRowDTO, Paginated, ProfileDTO } from '@/types';
import { hashPassword, verifyPassword } from '@lib/auth/password';
import { deleteImages, isOwnCloudinaryAsset } from '@lib/cloudinary';
import { ADMIN_PAGE_SIZE } from '@lib/constants';
import { AppError } from '@lib/errors';
import type { AddressOutput, ProfileOutput, RegisterOutput } from '@lib/validators/auth';

import { toAddress, toImage } from './mappers';

/* ─── Auth ───────────────────────────────────────────────────────────────── */

export async function registerCustomer(input: RegisterOutput) {
  await connectDB();
  if (await UserModel.exists({ email: input.email })) {
    throw new AppError('An account with this email already exists. Try signing in.');
  }
  const user = await UserModel.create({
    name: input.name,
    email: input.email,
    phone: input.phone,
    passwordHash: await hashPassword(input.password),
    role: 'customer',
  });

  // Link earlier guest orders placed with the same phone number.
  await OrderModel.updateMany(
    { user: null, 'customer.phone': input.phone },
    { $set: { user: user._id } },
  );

  return { id: String(user._id), role: user.role };
}

/** Same message for unknown email and wrong password — never reveal which. */
const INVALID_LOGIN = 'Incorrect email or password.';

export async function authenticate(email: string, password: string) {
  await connectDB();
  const user = await UserModel.findOne({ email }).select('+passwordHash');
  const ok = await verifyPassword(password, user?.passwordHash);
  if (!user || !ok) throw new AppError(INVALID_LOGIN, 401);
  if (!user.isActive)
    throw new AppError('This account has been disabled. Please contact support.', 403);
  user.lastLoginAt = new Date();
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
  const oldAvatar = user.avatar;
  user.name = input.name;
  user.phone = input.phone;
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
  await user.save();
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

export async function listCustomers(f: {
  q?: string;
  page?: number;
}): Promise<Paginated<CustomerRowDTO>> {
  await connectDB();
  const page = Math.max(1, f.page ?? 1);
  const query: Record<string, unknown> = { role: 'customer' };
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
  const stats = await OrderModel.aggregate<{ _id: unknown; n: number; spent: number }>([
    { $match: { user: { $in: docs.map((d) => d._id) }, status: { $nin: ['cancelled'] } } },
    { $group: { _id: '$user', n: { $sum: 1 }, spent: { $sum: '$total' } } },
  ]);
  const byUser = new Map(stats.map((s) => [String(s._id), s]));
  return {
    items: docs.map((u) => ({
      id: String(u._id),
      name: u.name,
      email: u.email,
      phone: u.phone,
      avatarUrl: u.avatar?.url,
      isActive: u.isActive,
      role: u.role,
      orderCount: byUser.get(String(u._id))?.n ?? 0,
      totalSpent: byUser.get(String(u._id))?.spent ?? 0,
      createdAt: new Date(u.createdAt).toISOString(),
    })),
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
  const [addresses, stats] = await Promise.all([
    listAddresses(id),
    OrderModel.aggregate<{ n: number; spent: number }>([
      { $match: { user: u._id, status: { $nin: ['cancelled'] } } },
      { $group: { _id: null, n: { $sum: 1 }, spent: { $sum: '$total' } } },
    ]),
  ]);
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
    orderCount: stats[0]?.n ?? 0,
    totalSpent: stats[0]?.spent ?? 0,
  };
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
