import * as React from 'react';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@components/ui/sheet';
import { cn } from '@lib/utils';

/* ─────────────────────────────────────────────────────────────────────────
 * Drawer — an opinionated wrapper over the `Sheet` primitive with three
 * visually distinct regions: a header (title + optional description, divided by
 * a border), a scrollable body, and a footer (separated, tinted, right-aligned
 * actions). The close button comes from <SheetContent>.
 *
 *   <Drawer open={open} onOpenChange={setOpen}>
 *     <DrawerContent>
 *       <Form className="flex h-full flex-col">
 *         <DrawerHeader title="Prepare new food" description="…" />
 *         <DrawerBody>…sections…</DrawerBody>
 *         <DrawerFooter>…buttons…</DrawerFooter>
 *       </Form>
 *     </DrawerContent>
 *   </Drawer>
 * ──────────────────────────────────────────────────────────────────────── */

export const Drawer = Sheet;

type DrawerContentProps = React.ComponentProps<typeof SheetContent>;

export function DrawerContent({ className, children, ...props }: DrawerContentProps) {
  return (
    <SheetContent side="right" className={cn('w-full gap-0 p-0 sm:max-w-xl', className)} {...props}>
      {children}
    </SheetContent>
  );
}

type DrawerHeaderProps = {
  title: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
};

export function DrawerHeader({ title, description, className }: DrawerHeaderProps) {
  return (
    <SheetHeader
      className={cn('border-line bg-surface shrink-0 gap-0 border-b px-5 py-4', className)}
    >
      <div className="min-w-0 space-y-0.5 pr-9">
        <SheetTitle className="type-section-title text-ink">{title}</SheetTitle>
        {description && (
          <SheetDescription className="text-muted text-[12.5px] leading-relaxed">
            {description}
          </SheetDescription>
        )}
      </div>
    </SheetHeader>
  );
}

export function DrawerBody({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex-1 space-y-6 overflow-y-auto px-5 py-5', className)} {...props} />;
}

export function DrawerFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'border-line bg-well/40 flex shrink-0 items-center justify-end gap-2.5 border-t px-5 py-3.5',
        className,
      )}
      {...props}
    />
  );
}
