import 'server-only';

import { cache } from 'react';
import type { z } from 'zod';

import { connectDB, DEFAULT_SETTINGS, type Settings, SettingsModel } from '@/database';
import type { SettingsDTO } from '@/types';
import type { settingsSchema } from '@lib/validators/settings';

function toSettings(s: Partial<Settings>): SettingsDTO {
  return {
    storeName: s.storeName ?? DEFAULT_SETTINGS.storeName,
    tagline: s.tagline ?? DEFAULT_SETTINGS.tagline,
    supportPhone: s.supportPhone ?? DEFAULT_SETTINGS.supportPhone,
    supportEmail: s.supportEmail,
    address: s.address ?? DEFAULT_SETTINGS.address,
    shippingFeeInsideDhaka: s.shippingFeeInsideDhaka ?? DEFAULT_SETTINGS.shippingFeeInsideDhaka,
    shippingFeeOutsideDhaka: s.shippingFeeOutsideDhaka ?? DEFAULT_SETTINGS.shippingFeeOutsideDhaka,
    freeShippingThreshold: s.freeShippingThreshold ?? DEFAULT_SETTINGS.freeShippingThreshold,
    announcement: s.announcement,
    social: { ...(s.social ?? {}) },
  };
}

/** Store settings singleton (created with defaults on first read). */
export const getSettings = cache(async (): Promise<SettingsDTO> => {
  await connectDB();
  const doc = await SettingsModel.findOneAndUpdate(
    { key: 'store' },
    { $setOnInsert: { key: 'store' } },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
  ).lean();
  return toSettings(doc ?? {});
});

export async function updateSettings(input: z.output<typeof settingsSchema>): Promise<void> {
  await connectDB();
  await SettingsModel.updateOne({ key: 'store' }, { $set: input }, { upsert: true });
}
