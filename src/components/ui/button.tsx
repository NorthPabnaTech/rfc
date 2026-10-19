'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';

import { cn } from '@lib/utils';

const buttonVariants = cva(
  "relative overflow-hidden after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:bg-current after:opacity-0 after:transition-[opacity] after:duration-200 after:ease-out active:after:opacity-[0.08] active:after:transition-none inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg text-[13px] font-medium whitespace-nowrap focus-ring transition-[background-color,color,box-shadow,transform] duration-150 ease-out active:scale-[0.96] active:duration-75 disabled:pointer-events-none disabled:opacity-50 disabled:active:scale-100 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        primary: 'bg-brand text-brand-contrast hover:bg-brand-hover',
        noir: 'bg-noir text-white hover:bg-noir-3',
        secondary: 'bg-panel text-ink hairline hover:bg-well',
        ghost: 'text-ink hover:bg-well',
        outline: 'bg-transparent text-ink hairline hover:bg-well',
        danger: 'bg-[var(--status-danger-fg)] text-white hover:opacity-90',
        link: 'text-accent hover:text-accent-hover hover:underline underline-offset-2 px-0 active:scale-100',
        // shadcn compat aliases
        default: 'bg-brand text-brand-contrast hover:bg-brand-hover',
        destructive: 'bg-[var(--status-danger-fg)] text-white hover:opacity-90',
      },
      size: {
        sm: 'h-8 px-3',
        md: 'h-9 px-3.5',
        lg: 'h-10 px-4 text-sm',
        icon: 'h-9 w-9 p-0',
        'icon-sm': 'h-8 w-8 p-0',
        // shadcn compat aliases
        default: 'h-10 px-4 text-sm',
        xs: 'h-7 gap-1 rounded-md px-2 text-xs',
        'icon-xs': 'h-7 w-7 rounded-md p-0',
        'icon-lg': 'h-10 w-10 p-0',
        xl: 'h-12 rounded-xl px-6 text-[15px]',
      },
    },
    defaultVariants: { variant: 'secondary', size: 'lg' },
  },
);

export type ButtonProps = React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean };

function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : 'button';
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { Button, buttonVariants };
