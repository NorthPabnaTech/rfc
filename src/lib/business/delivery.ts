import type { DeliveryArea } from '@/types/platform';
import { deliveryZoneFor, DIVISIONS } from '@lib/locations';

/** Every district (64), A→Z, with its Bangla name — reuses the existing BD location data. */
export const DISTRICTS = DIVISIONS.flatMap((d) => d.districts).sort((a, b) =>
  a.name.localeCompare(b.name),
);

export function upazilasOf(district: string | undefined): string[] {
  return DISTRICTS.find((d) => d.name === district)?.areas ?? [];
}

const SUB_DHAKA_DISTRICTS = new Set(['Dhaka', 'Gazipur', 'Narayanganj']);

/** Delivery area from the address: Dhaka city → inside, greater Dhaka → sub, rest → outside. */
export function detectDeliveryArea(
  district: string | undefined,
  upazila: string | undefined,
): DeliveryArea {
  if (!district) return 'outside_dhaka';
  if (deliveryZoneFor(district, upazila) === 'inside_dhaka') return 'inside_dhaka';
  if (SUB_DHAKA_DISTRICTS.has(district)) return 'sub_dhaka';
  return 'outside_dhaka';
}

export const DELIVERY_AREAS: DeliveryArea[] = ['inside_dhaka', 'sub_dhaka', 'outside_dhaka'];
