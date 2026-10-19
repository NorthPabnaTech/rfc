import * as React from 'react';

import { FIELD_TEXT, type FieldSize } from '@components/ui/field-size';
import { cn } from '@lib/utils/index';

const TEXTAREA_MIN_H: Record<FieldSize, string> = {
  lg: 'min-h-24 py-2.5',
  md: 'min-h-20 py-2',
  sm: 'min-h-16 py-1.5',
};

function Textarea({
  className,
  size = 'md',
  ...props
}: Omit<React.ComponentProps<'textarea'>, 'size'> & { size?: FieldSize }) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'border-line text-ink placeholder:text-muted/70 flex w-full rounded-md border bg-white px-3 py-2 text-xs shadow-2xs transition-[border-color,box-shadow] outline-none',
        'focus:border-accent focus:ring-accent focus:ring-1 focus:outline-none',
        'focus-visible:border-accent focus-visible:ring-accent focus-visible:ring-1 focus-visible:outline-none',
        'disabled:bg-well/50 disabled:cursor-not-allowed disabled:opacity-60',
        'aria-invalid:border-red-500 aria-invalid:ring-1 aria-invalid:ring-red-500/20',
        TEXTAREA_MIN_H[size],
        FIELD_TEXT[size],
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
