import { NextRequest } from 'next/server';
import { z } from 'zod';

import { ResellerChangeLogModel, type ResellerFieldChange } from '@/database';
import {
  requireReseller,
  resellerError,
  resellerJson,
  resellerOptionsResponse,
} from '@lib/auth/reseller-auth';

const updateMeSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  shopName: z.string().trim().min(2).max(100).optional(),
  phone: z.string().trim().min(8).max(20).optional(),
  avatarUrl: z.union([z.string().trim().url().max(1000), z.literal(''), z.null()]).optional(),
  address: z.string().trim().max(300).optional(),
  payoutDetails: z
    .object({
      bkash: z.string().trim().max(20).optional(),
      nagad: z.string().trim().max(20).optional(),
      bankInfo: z.string().trim().max(300).optional(),
    })
    .optional(),
});

export function OPTIONS() {
  return resellerOptionsResponse();
}

export async function GET(req: NextRequest) {
  const auth = await requireReseller(req);
  if (auth.error) return auth.error;
  const r = auth.reseller;

  return resellerJson({
    ok: true,
    data: {
      id: String(r._id),
      name: r.name,
      shopName: r.shopName,
      email: r.email,
      phone: r.phone ?? null,
      avatarUrl: r.avatarUrl ?? null,
      address: r.address ?? null,
      isActive: r.isActive,
      walletBalance: r.walletBalance,
      totalDeposited: r.totalDeposited,
      totalWithdrawn: r.totalWithdrawn,
      totalProfitEarned: r.totalProfitEarned,
      totalSales: r.totalSales,
      totalOrders: r.totalOrders,
      payoutDetails: r.payoutDetails ?? {},
      createdAt: r.createdAt,
    },
  });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireReseller(req);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const parsed = updateMeSchema.safeParse(body);
    if (!parsed.success) {
      return resellerError(parsed.error.issues[0]?.message ?? 'Invalid input.', 400);
    }

    const r = auth.reseller;
    const changes: ResellerFieldChange[] = [];
    const track = (field: string, label: string, oldVal: string | undefined, newVal: string | undefined) => {
      const prev = oldVal ?? '';
      const next = newVal ?? '';
      if (prev !== next) {
        changes.push({
          field,
          label,
          oldValue: prev || undefined,
          newValue: next || undefined,
        });
      }
    };

    if (parsed.data.name !== undefined) {
      track('name', 'Full Name', r.name, parsed.data.name);
      r.name = parsed.data.name;
    }
    if (parsed.data.shopName !== undefined) {
      track('shopName', 'Shop Name', r.shopName, parsed.data.shopName);
      r.shopName = parsed.data.shopName;
    }
    if (parsed.data.phone !== undefined) {
      track('phone', 'Phone', r.phone, parsed.data.phone);
      r.phone = parsed.data.phone;
    }
    if (parsed.data.avatarUrl !== undefined) {
      const nextAvatar = parsed.data.avatarUrl || undefined;
      track('avatarUrl', 'Profile Photo', r.avatarUrl, nextAvatar);
      r.avatarUrl = nextAvatar;
    }
    if (parsed.data.address !== undefined) {
      track('address', 'Address', r.address, parsed.data.address);
      r.address = parsed.data.address;
    }
    if (parsed.data.payoutDetails !== undefined) {
      const pd = parsed.data.payoutDetails;
      if (pd.bkash !== undefined) {
        track('payoutDetails.bkash', 'bKash', r.payoutDetails?.bkash, pd.bkash);
      }
      if (pd.nagad !== undefined) {
        track('payoutDetails.nagad', 'Nagad', r.payoutDetails?.nagad, pd.nagad);
      }
      if (pd.bankInfo !== undefined) {
        track('payoutDetails.bankInfo', 'Bank Info', r.payoutDetails?.bankInfo, pd.bankInfo);
      }
      r.payoutDetails = { ...r.payoutDetails, ...pd };
    }

    await r.save();

    if (changes.length > 0) {
      const forwardedFor = req.headers.get('x-forwarded-for');
      const ipAddress = forwardedFor?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || undefined;
      const userAgent = req.headers.get('user-agent')?.slice(0, 300) || undefined;
      await ResellerChangeLogModel.create({
        reseller: r._id,
        changes,
        ipAddress,
        userAgent,
      });
    }

    return resellerJson({
      ok: true,
      data: {
        id: String(r._id),
        name: r.name,
        shopName: r.shopName,
        email: r.email,
        phone: r.phone ?? null,
        avatarUrl: r.avatarUrl ?? null,
        address: r.address ?? null,
        payoutDetails: r.payoutDetails ?? {},
      },
    });
  } catch (err) {
    if (typeof err === 'object' && err !== null && 'code' in err && err.code === 11000) {
      return resellerError('Phone number is already in use by another account.', 409);
    }
    return resellerError('Failed to update profile.', 500);
  }
}
