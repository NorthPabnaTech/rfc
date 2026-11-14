'use client';

import { useRouter } from 'nextjs-toploader/app';

import { adjustStockAction } from '@/actions/admin';
import { Form, FormInput, FormItem, FormSelect, FormTextarea } from '@components/form';
import { StatusBadge } from '@components/shared';
import { Button } from '@components/ui/button';
import { DatePicker } from '@components/ui/date-picker';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@components/ui/dialog';
import { handleActionResult } from '@lib/action-client';
import { STOCK_ADJUSTMENT_REASONS } from '@lib/constants';
import { dayjs } from '@lib/utils';
import { type StockAdjustmentInput, stockAdjustmentSchema } from '@lib/validators/management';

export function StockAdjustDialog({
  product,
  initialType = 'stock_in',
  onClose,
}: {
  product: { id: string; name: string; stockQuantity: number };
  initialType?: 'stock_in' | 'stock_out';
  onClose: () => void;
}) {
  const router = useRouter();
  const form = Form.useForm<StockAdjustmentInput>({
    schema: stockAdjustmentSchema,
    defaultValues: {
      productId: product.id,
      type: initialType,
      quantity: 1,
      reason:
        initialType === 'stock_in' ? 'New inventory purchase' : 'Damaged / defective',
      date: dayjs().tz('Asia/Dhaka').format('YYYY-MM-DD'),
      notes: '',
    },
  });
  const { isSubmitting } = form.formState;
  const type = form.watch('type');

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <Form
          form={form}
          onFinish={async (values) => {
            const res = await adjustStockAction(values);
            if (handleActionResult(res, form)) {
              onClose();
              router.refresh();
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {type === 'stock_in' ? 'Stock In' : 'Stock Out'} — {product.name}
            </DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <div className="bg-surface flex items-center justify-between rounded-lg px-3 py-2 text-sm">
              <span className="text-muted">Current stock quantity</span>
              <StatusBadge
                status={product.stockQuantity > 0 ? 'ok' : 'danger'}
                label={`${product.stockQuantity} units`}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormSelect
                name="type"
                label="Adjustment type"
                items={[
                  { value: 'stock_in', label: 'Stock In (+)' },
                  { value: 'stock_out', label: 'Stock Out (-)' },
                ]}
              />
              <FormInput
                name="quantity"
                type="number"
                min={1}
                label="Quantity"
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormSelect
                name="reason"
                label="Reason"
                required
                items={STOCK_ADJUSTMENT_REASONS.map((r) => ({ value: r, label: r }))}
              />
              <FormItem name="date" label="Date">
                {(field) => (
                  <DatePicker
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                  />
                )}
              </FormItem>
            </div>

            <FormTextarea
              name="notes"
              label="Notes (optional)"
              rows={2}
              placeholder="Supplier invoice, damage details, etc."
            />
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant={type === 'stock_out' ? 'danger' : 'primary'}
              disabled={isSubmitting}
            >
              {isSubmitting
                ? 'Updating…'
                : type === 'stock_in'
                  ? 'Confirm Stock In'
                  : 'Confirm Stock Out'}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
