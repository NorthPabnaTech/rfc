import 'server-only';

import { z } from 'zod';

import { DEFAULT_SETTINGS } from '@/mock/settings';
import type { PlatformSettings } from '@/types/platform';
import { AppError } from '@lib/errors';
import { businessSettingsSchema, generalSettingsSchema, telegramLink } from '@lib/validators/reseller';

import { serverT } from '../http';
import { toSettings } from '../mappers';
import { SettingsModel } from '../models';

const ID = 'platform';

export async function getSettings(): Promise<PlatformSettings> {
  const doc =
    (await SettingsModel.findById(ID).lean()) ??
    (await SettingsModel.findOneAndUpdate(
      { _id: ID },
      { $setOnInsert: { _id: ID, ...DEFAULT_SETTINGS } },
      { upsert: true, new: true, lean: true },
    ));
  return toSettings({ ...DEFAULT_SETTINGS, ...doc });
}

/** What sellers and visitors may read (no default margin). */
export async function getPublicSettings() {
  const s = await getSettings();
  return {
    platformName: s.platformName,
    contactEmail: s.contactEmail,
    supportPhone: s.supportPhone,
    deliveryCharges: s.deliveryCharges,
    minAddBalance: s.minAddBalance,
    minWithdrawal: s.minWithdrawal,
    withdrawalFees: s.withdrawalFees,
    earningsReleaseHours: s.earningsReleaseHours,
    telegramSupport: s.telegramSupport,
    telegramGroup: s.telegramGroup,
  };
}

const general = generalSettingsSchema(serverT).partial();
const business = businessSettingsSchema(serverT).partial();

/** Admin update. Accepts the general, business and telegram fields in one patch. */
export const settingsPatchSchema = z.object({
  ...general.shape,
  defaultMargin: business.shape.defaultMargin,
  defaultPackagingCharge: business.shape.defaultPackagingCharge,
  minAddBalance: business.shape.minAddBalance,
  minWithdrawal: business.shape.minWithdrawal,
  earningsReleaseHours: business.shape.earningsReleaseHours,
  deliveryCharges: z
    .object({ inside_dhaka: z.number().min(0), sub_dhaka: z.number().min(0), outside_dhaka: z.number().min(0) })
    .optional(),
  withdrawalFees: z
    .object({
      threshold: z.number().min(1),
      lowFee: z.number().min(0),
      highFee: z.number().min(0),
      atThresholdFee: z.number().min(0),
    })
    .optional(),
  telegramSupport: telegramLink(serverT).optional(),
  telegramGroup: telegramLink(serverT).optional(),
});

export async function updateSettings(patch: z.output<typeof settingsPatchSchema>) {
  const current = await getSettings();
  const clean = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
  // A withdrawal must always pay out something: the minimum has to exceed every fee.
  const minWithdrawal = patch.minWithdrawal ?? current.minWithdrawal;
  const fees = patch.withdrawalFees ?? current.withdrawalFees;
  const maxFee = Math.max(fees.lowFee, fees.highFee, fees.atThresholdFee);
  if (minWithdrawal <= maxFee) {
    throw new AppError(`Minimum withdrawal (৳${minWithdrawal}) must be more than the highest withdrawal fee (৳${maxFee}).`, 422);
  }
  await SettingsModel.updateOne({ _id: ID }, { $set: clean });
  return getSettings();
}
