'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type { z } from 'zod';

import { updateOrderAddressAction } from '@/actions/admin';
import { LocationFields } from '@/features/address/location-fields';
import { ShippingAddressBlock } from '@/features/orders/order-ui';
import type { OrderDTO } from '@/types';
import { Form, FormInput } from '@components/form';
import { Icon } from '@components/icon/icon';
import { Button } from '@components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@components/ui/dialog';
import { handleActionResult } from '@lib/action-client';
import { updateOrderAddressSchema } from '@lib/validators/order';

type AddressFormValues = z.input<typeof updateOrderAddressSchema>;

export function DeliveryAddressCard({ order }: { order: OrderDTO }) {
  const [open, setOpen] = React.useState(false);

  return (
    <section className="bg-panel hairline rounded-xl2 p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-ink text-[14px] font-semibold">Delivery address</h2>
        <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
          <Icon name="pencil" size={13} /> Edit
        </Button>
      </div>
      <ShippingAddressBlock order={order} />

      {open && <EditAddressDialog order={order} onClose={() => setOpen(false)} />}
    </section>
  );
}

function EditAddressDialog({ order, onClose }: { order: OrderDTO; onClose: () => void }) {
  const router = useRouter();
  const a = order.shippingAddress;

  const form = Form.useForm<AddressFormValues>({
    schema: updateOrderAddressSchema,
    defaultValues: {
      orderId: order.id,
      fullName: a.fullName,
      phone: a.phone,
      addressLine: a.addressLine,
      division: a.division,
      city: a.city,
      area: a.area,
      zone: a.zone,
    },
  });
  const { isSubmitting } = form.formState;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Delivery Address — {order.orderNumber}</DialogTitle>
        </DialogHeader>
        <Form
          form={form}
          onFinish={async (values) => {
            const res = await updateOrderAddressAction(values);
            if (handleActionResult(res, form)) {
              onClose();
              router.refresh();
            }
          }}
        >
          <DialogBody className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormInput name="fullName" label="Recipient name" required />
              <FormInput
                name="phone"
                label="Mobile number"
                placeholder="01XXXXXXXXX"
                inputMode="tel"
                required
              />
            </div>
            <FormInput
              name="addressLine"
              label="Street / House / Flat"
              placeholder="House, road, flat…"
              required
            />
            <div className="grid gap-4 sm:grid-cols-3">
              <LocationFields />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Save address'}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
