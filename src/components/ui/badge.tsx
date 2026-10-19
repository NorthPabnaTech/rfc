'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';

import { cn } from '@lib/utils/index';

const badgeVariants = cva(
  'inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2 py-0.5 text-[11px] font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground [a&]:hover:bg-primary/90',
        secondary: 'bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90',
        destructive:
          'bg-destructive text-white focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40 [a&]:hover:bg-destructive/90',
        outline: 'border-border text-foreground [a&]:hover:bg-well [a&]:hover:text-ink',
        ghost: '[a&]:hover:bg-well [a&]:hover:text-ink',
        link: 'text-primary underline-offset-4 [a&]:hover:underline',
      },
      tone: {
        neutral: 'bg-well text-muted hairline',
        brand: 'bg-brand-soft text-brand-ink',
        ok: 'bg-[var(--status-ok-bg)] text-[var(--status-ok-fg)]',
        warn: 'bg-[var(--status-warn-bg)] text-[var(--status-warn-fg)]',
        danger: 'bg-[var(--status-danger-bg)] text-[var(--status-danger-fg)]',
        info: 'bg-[var(--status-info-bg)] text-[var(--status-info-fg)]',
        locked: 'bg-indigo-50 text-indigo-700 border-indigo-200/60',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export type BadgeProps = React.ComponentProps<'span'> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean };

function Badge({ className, variant, tone, asChild = false, ...props }: BadgeProps) {
  const Comp = asChild ? Slot.Root : 'span';

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      data-tone={tone}
      className={cn(
        badgeVariants({ variant: tone ? undefined : (variant ?? 'default'), tone }),
        className,
      )}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
