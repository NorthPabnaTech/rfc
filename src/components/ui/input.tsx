import * as React from 'react';

import { cn } from '@lib/utils/index';

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'border-line text-ink h-9 w-full min-w-0 rounded-md border bg-white px-3 py-1 text-xs shadow-2xs transition-[border-color,box-shadow] outline-none',
        'placeholder:text-muted/70 selection:bg-primary selection:text-primary-foreground',
        'focus:border-accent focus:ring-accent focus:ring-1 focus:outline-none',
        'focus-visible:border-accent focus-visible:ring-accent focus-visible:ring-1 focus-visible:outline-none',
        'disabled:bg-well/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60',
        'aria-invalid:border-red-500 aria-invalid:ring-1 aria-invalid:ring-red-500/20',
        className,
      )}
      {...props}
    />
  );
}

export { Input };
