'use client';

import { useI18n } from '@/i18n/provider';
import { DateRangePicker } from '@components/ui/date-picker';
import { Select } from '@components/ui/select';
import { RANGE_KEYS, type RangeKey } from '@lib/business/analytics';

export type RangeValue = { key: RangeKey; custom?: { from?: string; to?: string } };

/** Preset date ranges + a custom range picker (All time, Today, … Custom). */
export function RangeFilter({
  value,
  onChange,
  className,
}: {
  value: RangeValue;
  onChange: (v: RangeValue) => void;
  className?: string;
}) {
  const { t } = useI18n();
  return (
    <div className={className ?? 'flex flex-col gap-2 sm:flex-row'}>
      <Select
        size="md"
        className="sm:w-44"
        value={value.key}
        onValueChange={(k) => onChange({ key: k as RangeKey, custom: value.custom })}
        items={RANGE_KEYS.map((k) => ({
          value: k,
          label: t(`range.${k}`),
          icon: 'calendar' as const,
        }))}
        aria-label={t('common.dateRange')}
      />
      {value.key === 'custom' && (
        <DateRangePicker
          size="md"
          className="sm:w-64"
          value={value.custom}
          onChange={(custom) => onChange({ key: 'custom', custom })}
          placeholder={t('common.dateRange')}
        />
      )}
    </div>
  );
}
