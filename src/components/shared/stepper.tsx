import { cn } from '@lib/utils';

/* ─────────────────────────────────────────────────────────────────────────
 * Stepper — the read-only lifecycle strip shown at the top of a wizard-style
 * dialog (Draft → Effective date → Approval → Active). It reflects where a
 * record sits; it is not a control, so steps are never clickable.
 *
 *   <Stepper steps={['Draft', 'Approval', 'Active']} current={0} />
 * ──────────────────────────────────────────────────────────────────────── */

type Props = {
  steps: readonly string[];
  /** Zero-based index of the active step. */
  current: number;
  className?: string;
};

export function Stepper({ steps, current, className }: Props) {
  return (
    <ol className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {steps.map((label, i) => (
        <li key={label} className="flex items-center gap-1.5">
          <span
            className={cn(
              'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium',
              i === current ? 'bg-brand-soft text-brand-ink' : 'bg-well text-muted',
            )}
          >
            <span
              className={cn(
                'grid h-4 w-4 place-items-center rounded-full text-[9.5px] font-bold',
                i === current ? 'bg-brand text-brand-contrast' : 'bg-line text-muted',
              )}
            >
              {i + 1}
            </span>
            {label}
          </span>
          {i < steps.length - 1 && <span className="bg-line-2 h-px w-3" aria-hidden="true" />}
        </li>
      ))}
    </ol>
  );
}
