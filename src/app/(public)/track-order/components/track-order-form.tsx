'use client';

import * as React from 'react';
import type { z } from 'zod';

import { trackOrderAction } from '@/actions/checkout';
import {
  OrderItemsList,
  OrderProgress,
  OrderStatusBadge,
  OrderTotals,
} from '@/features/orders/order-ui';
import type { OrderDTO } from '@/types';
import { Form, FormInput } from '@components/form';
import { Icon } from '@components/icon/icon';
import { Button } from '@components/ui/button';
import { handleActionResult } from '@lib/action-client';
import { formatStoreDate } from '@lib/utils';
import { trackOrderSchema } from '@lib/validators/order';

type Values = z.input<typeof trackOrderSchema>;

export function TrackOrderForm({ initialOrderNumber }: { initialOrderNumber: string }) {
  const [order, setOrder] = React.useState<OrderDTO | null>(null);
  const form = Form.useForm<Values>({
    schema: trackOrderSchema,
    defaultValues: { orderNumber: initialOrderNumber, phone: '' },
  });
  const { isSubmitting } = form.formState;

  return (
    <div className="mt-10 space-y-10">
      <Form
        form={form}
        className="bg-cream grid gap-4 rounded-3xl p-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-start"
        onFinish={async (values) => {
          setOrder(null);
          const res = await trackOrderAction(values);
          if (handleActionResult(res, form, { successToast: false })) setOrder(res.data);
        }}
      >
        <FormInput name="orderNumber" label="Order number" placeholder="RFC-100001" required />
        <FormInput
          name="phone"
          label="Mobile number"
          placeholder="01XXXXXXXXX"
          inputMode="tel"
          required
        />
        {/* Same label row as the fields beside it, so the button lines up with
            the inputs without hand-tuned margins. */}
        <div className="flex flex-col gap-1.5">
          <span aria-hidden className="type-label invisible hidden sm:block">
            Track
          </span>
          <Button type="submit" variant="noir" size="lg" disabled={isSubmitting}>
            <Icon name="search" size={16} /> {isSubmitting ? 'Searching…' : 'Track'}
          </Button>
        </div>
      </Form>

      {order && (
        <div className="animate-fade-up border-line space-y-8 rounded-3xl border bg-white p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-muted text-xs tracking-wide uppercase">Order</p>
              <p className="font-display text-ink text-2xl">{order.orderNumber}</p>
              <p className="text-muted text-sm">Placed {formatStoreDate(order.createdAt)}</p>
            </div>
            <OrderStatusBadge status={order.status} />
          </div>
          <OrderProgress order={order} />
          <OrderItemsList order={order} />
          <div className="ml-auto max-w-xs">
            <OrderTotals order={order} />
          </div>
        </div>
      )}
    </div>
  );
}
