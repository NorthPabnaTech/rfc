import type { PlatformSettings } from '@/types/platform';
import { PLATFORM } from '@config/platform';

/** Default business settings (editable in Admin → Settings during Phase 1). */
export const DEFAULT_SETTINGS: PlatformSettings = {
  platformName: PLATFORM.name,
  contactEmail: 'support@example.com',
  supportPhone: '',
  currency: 'BDT',
  timezone: 'Asia/Dhaka',
  defaultMargin: 80,
  defaultPackagingCharge: 20,
  deliveryCharges: { inside_dhaka: 70, sub_dhaka: 100, outside_dhaka: 130 },
  minAddBalance: 100,
  minWithdrawal: 50,
  withdrawalFees: { threshold: 1000, lowFee: 5, highFee: 10, atThresholdFee: 10 },
  earningsReleaseHours: 48,
  telegramSupport: PLATFORM.telegram.support,
  telegramGroup: PLATFORM.telegram.group,
};
