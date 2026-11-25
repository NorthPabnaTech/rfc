'use client';

import * as React from 'react';
import { useRouter } from 'nextjs-toploader/app';
import { z } from 'zod';

import { adjustResellerWalletAction } from '@/actions/resellers';
import { Form, FormCurrency, FormSelect, FormTextarea } from '@components/form';
import { Icon } from '@components/icon/icon';
import { ConfirmDialog } from '@components/shared';
import { Button } from '@components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@components/ui/dialog';
import { toast } from '@lib/toast';
import { formatNumber } from '@lib/utils';

const adjustSchema = z.object({
  direction: z.enum(['credit', 'debit']),
  amount: z.coerce.number().positive('Enter a valid amount'),
  note: z.string().trim().min(1, 'Please enter a note').max(500),
});

type AdjustFormValues = z.input<typeof adjustSchema>;
type AdjustOutput = z.output<typeof adjustSchema>;

export function ResellerDetailActions({ resellerId }: { resellerId: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pendingAdjust, setPendingAdjust] = React.useState<AdjustOutput | null>(null);

  const form = Form.useForm<AdjustFormValues>({
    schema: adjustSchema,
    defaultValues: {
      direction: 'credit',
      amount: '',
      note: '',
    },
  });
  const { isSubmitting } = form.formState;

  function handleOpenChange(next: boolean) {
    if (isSubmitting) return;
    setOpen(next);
    if (!next) form.reset({ direction: 'credit', amount: '', note: '' });
  }

  async function handleConfirmAdjust() {
    if (!pendingAdjust) return;
    const res = await adjustResellerWalletAction({
      resellerId,
      direction: pendingAdjust.direction,
      amount: pendingAdjust.amount,
      note: pendingAdjust.note,
    });
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success('Wallet balance adjusted');
    setPendingAdjust(null);
    setOpen(false);
    form.reset({ direction: 'credit', amount: '', note: '' });
    router.refresh();
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Icon name="coin" size={15} /> Adjust wallet
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <Form
            form={form}
            onFinish={(raw) => {
              const values = adjustSchema.parse(raw);
              setPendingAdjust(values);
            }}
          >
            <DialogHeader>
              <DialogTitle>Manual wallet adjustment</DialogTitle>
            </DialogHeader>
            <DialogBody className="space-y-4">
              <FormSelect
                name="direction"
                label="Adjustment type"
                required
                items={[
                  { value: 'credit', label: 'Add (+ Credit)' },
                  { value: 'debit', label: 'Deduct (- Debit)' },
                ]}
              />
              <FormCurrency name="amount" label="Amount (৳)" required placeholder="0" />
              <FormTextarea
                name="note"
                label="Reason / note"
                required
                rows={3}
                placeholder="e.g. bKash deposit verified"
              />
            </DialogBody>
            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                disabled={isSubmitting}
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Applying…' : 'Apply adjustment'}
              </Button>
            </DialogFooter>
          </Form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!pendingAdjust}
        onOpenChange={(o) => !o && setPendingAdjust(null)}
        tone={pendingAdjust?.direction === 'debit' ? 'danger' : 'info'}
        title={
          pendingAdjust?.direction === 'debit'
            ? 'Deduct from reseller wallet?'
            : 'Add to reseller wallet?'
        }
        description={
          pendingAdjust
            ? `${pendingAdjust.direction === 'debit' ? 'Deduct' : 'Add'} ৳${formatNumber(pendingAdjust.amount)} ${pendingAdjust.direction === 'debit' ? 'from' : 'to'} this reseller’s wallet. Note: “${pendingAdjust.note}”`
            : ''
        }
        confirmLabel={
          pendingAdjust?.direction === 'debit' ? 'Confirm deduction' : 'Confirm credit'
        }
        onConfirm={handleConfirmAdjust}
      />
    </>
  );
}
