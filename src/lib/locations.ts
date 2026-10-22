/**
 * Bangladesh divisions → districts → areas for the address dropdowns, and
 * the delivery-zone rule built on them. Client-safe (no server imports): the
 * same data validates addresses on the server and fills the dropdowns.
 *
 * Divisions, districts and upazilas come from bdapis.com, saved locally by
 * `npm run sync:locations`; Dhaka city's thanas are added here.
 */
import { INSIDE_DHAKA_DISTRICT, type ShippingZone } from '@lib/constants';

import BD_LOCATIONS from './data/bd-locations.json';

export type BdDistrict = { name: string; nameBn: string; areas: string[] };
export type BdDivision = { name: string; nameBn: string; districts: BdDistrict[] };

/** Dhaka Metropolitan (city) thanas — the "Inside Dhaka" delivery areas. */
export const DHAKA_CITY_AREAS = [
  'Adabor',
  'Badda',
  'Banani',
  'Bangshal',
  'Bashundhara',
  'Bhashantek',
  'Bhatara',
  'Biman Bandar (Airport)',
  'Cantonment',
  'Chawkbazar',
  'Dakshinkhan',
  'Darus Salam',
  'Demra',
  'Dhanmondi',
  'Gendaria',
  'Gulshan',
  'Hatirjheel',
  'Hazaribagh',
  'Jatrabari',
  'Kadamtali',
  'Kafrul',
  'Kalabagan',
  'Kamrangirchar',
  'Khilgaon',
  'Khilkhet',
  'Kotwali',
  'Lalbagh',
  'Mirpur',
  'Mohammadpur',
  'Motijheel',
  'Mugda',
  'New Market',
  'Pallabi',
  'Paltan',
  'Ramna',
  'Rampura',
  'Rupnagar',
  'Sabujbagh',
  'Shah Ali',
  'Shahbagh',
  'Shahjahanpur',
  'Sher-e-Bangla Nagar',
  'Shyampur',
  'Sutrapur',
  'Tejgaon',
  'Tejgaon Industrial Area',
  'Turag',
  'Uttara',
  'Uttarkhan',
  'Wari',
] as const;

const CITY_AREAS = new Set<string>(DHAKA_CITY_AREAS);

/** All divisions, with Dhaka city thanas listed first under Dhaka district. */
export const DIVISIONS: BdDivision[] = (BD_LOCATIONS as BdDivision[]).map((division) => ({
  ...division,
  districts: division.districts.map((district) =>
    district.name === INSIDE_DHAKA_DISTRICT
      ? { ...district, areas: [...DHAKA_CITY_AREAS, ...district.areas] }
      : district,
  ),
}));

export function districtsOf(division: string | undefined): BdDistrict[] {
  return DIVISIONS.find((d) => d.name === division)?.districts ?? [];
}

export function areasOf(division: string | undefined, district: string | undefined): string[] {
  return districtsOf(division).find((d) => d.name === district)?.areas ?? [];
}

/** True when the district belongs to the division and the area to the district. */
export function isKnownLocation(division: string, district: string, area: string): boolean {
  return areasOf(division, district).includes(area);
}

/** The delivery zone (and so the shipping charge) for a district + area. */
export function deliveryZoneFor(district: string | undefined, area: string | undefined): ShippingZone {
  return district === INSIDE_DHAKA_DISTRICT && area && CITY_AREAS.has(area)
    ? 'inside_dhaka'
    : 'outside_dhaka';
}
