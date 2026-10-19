import { Select, type SelectProps } from '@components/ui/select';
import { cn } from '@lib/utils';

/* ─────────────────────────────────────────────────────────────────────────
 * FilterSelect — a `Select` sized for list toolbars.
 *
 * The base `Select` trigger is `w-full` (so it fills a form field). Dropped
 * straight into a `flex flex-wrap` toolbar that makes every filter expand to a
 * full-width row and stack vertically. FilterSelect wraps it in a fixed,
 * responsive, non-shrinking box so filters line up neatly and wrap as a group.
 *
 *   <FilterSelect aria-label="Status" value={v} onValueChange={set} items={…} />
 *   <FilterSelect width="sm:w-40" … />
 * ──────────────────────────────────────────────────────────────────────── */

type Props = SelectProps & {
  /** Width utilities for the wrapper. Default `w-44`. */
  width?: string;
};

export function FilterSelect({ width = 'w-44', ...props }: Props) {
  return (
    <div className={cn('shrink-0', width)}>
      <Select {...props} />
    </div>
  );
}
