'use client';

import * as React from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

import { FormSelect } from '@components/form';
import { SHIPPING_ZONE_LABELS, type ShippingZone } from '@lib/constants';
import { areasOf, deliveryZoneFor, districtsOf, DIVISIONS } from '@lib/locations';
import { cn } from '@lib/utils';

const DIVISION_ITEMS = DIVISIONS.map((d) => ({
  value: d.name,
  label: `${d.name} (${d.nameBn})`,
}));

type Props = {
  /** Classes for each of the three field wrappers (e.g. grid spans). */
  className?: string;
};

/**
 * Division → District → Area / Thana dropdowns for any address form with
 * `division`, `city` (district), `area` and `zone` fields. Picking a parent
 * clears children that no longer belong to it, and `zone` (the delivery
 * charge) follows the district + area automatically.
 */
export function LocationFields({ className }: Props) {
  const { setValue, getValues } = useFormContext();
  const [division, city, area] = useWatch({ name: ['division', 'city', 'area'] }) as [
    string | undefined,
    string | undefined,
    string | undefined,
  ];

  const districts = districtsOf(division);
  const areas = areasOf(division, city);

  React.useEffect(() => {
    const opts = { shouldDirty: true } as const;
    // Older saved addresses only have a district — find its division.
    if (!division && city) {
      const owner = DIVISIONS.find((d) => d.districts.some((x) => x.name === city));
      if (owner) {
        setValue('division', owner.name, opts);
        return;
      }
    }
    if (city && !districts.some((d) => d.name === city)) setValue('city', '', opts);
    if (area && !areas.includes(area)) setValue('area', '', opts);
    const zone: ShippingZone = deliveryZoneFor(city, area);
    if (getValues('zone') !== zone) setValue('zone', zone, opts);
  }, [division, city, area, districts, areas, setValue, getValues]);

  return (
    <>
      <FormSelect
        name="division"
        label="Division"
        required
        placeholder="Select division"
        showSearch
        searchPlaceholder="Search division…"
        emptyText="No division found"
        items={DIVISION_ITEMS}
        className={className}
      />
      <FormSelect
        name="city"
        label="District"
        required
        placeholder={division ? 'Select district' : 'Select a division first'}
        showSearch
        searchPlaceholder="Search district…"
        emptyText="No district found"
        disabled={!division}
        items={districts.map((d) => ({ value: d.name, label: `${d.name} (${d.nameBn})` }))}
        className={className}
      />
      <FormSelect
        name="area"
        label="Area / Thana"
        required
        placeholder={city ? 'Select area / thana' : 'Select a district first'}
        showSearch
        searchPlaceholder="Search area…"
        emptyText="No area found"
        disabled={!city}
        items={areas.map((a) => ({ value: a, label: a }))}
        className={className}
      />
    </>
  );
}

/** One-line note of the delivery zone `LocationFields` picked. */
export function DeliveryZoneNote({ className }: { className?: string }) {
  const [zone, area] = useWatch({ name: ['zone', 'area'] }) as [ShippingZone | undefined, string];
  if (!area || !zone) return null;
  return (
    <p className={cn('type-helper text-muted', className)}>
      Delivery zone: <span className="text-ink font-semibold">{SHIPPING_ZONE_LABELS[zone]}</span>{' '}
      (set automatically from the area)
    </p>
  );
}
