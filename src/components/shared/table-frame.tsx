import * as React from 'react';

import { cn } from '@lib/utils';

/* ─────────────────────────────────────────────────────────────────────────
 * TableFrame — the card frame around a hand-rolled `<Table>` (matrix, detail
 * breakdowns…), styled exactly like `DataTable`'s root so both read as one
 * component.
 *
 * Use this instead of a `hairline` wrapper whenever the contents paint their
 * own backgrounds: `.hairline` is an INSET box-shadow, and a parent's inset
 * shadow is painted below its descendants — so a hovered row (or any tinted
 * cell) covers the left/right edges and the frame looks broken. A real border
 * lives outside the padding box, where no child can reach it.
 *
 *   <TableFrame>
 *     <Table>…</Table>
 *   </TableFrame>
 * ──────────────────────────────────────────────────────────────────────── */

export function TableFrame({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="table-frame"
      className={cn('border-line rounded-xl2 bg-panel overflow-hidden border', className)}
      {...props}
    />
  );
}
