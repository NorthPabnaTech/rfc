'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { deleteAddressAction, saveAddressAction } from '@/actions/account';
import { DeliveryZoneNote, LocationFields } from '@/features/address/location-fields';
import type { AddressDTO } from '@/types';
import { Form, FormCheckbox, FormInput } from '@components/form';
import { Icon } from '@components/icon/icon';
import { ConfirmDialog, EmptyState } from '@components/shared';
import { Button } from '@components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@components/ui/dialog';
import { useModal } from '@hooks/use-modal';
import { handleActionResult } from '@lib/action-client';
import { SHIPPING_ZONE_LABELS } from '@lib/constants';
import { type AddressInput, addressSchema } from '@lib/validators/auth';

export function AddressBook({ addresses }: { addresses: AddressDTO[] }) {
  const router = useRouter();
  const modal = useModal<AddressDTO>();
  const [deleting, setDeleting] = React.useState<AddressDTO | null>(null);

  return (
    <section className="border-line rounded-3xl border bg-white p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-ink text-lg font-semibold">Saved addresses</h2>
          <p className="text-muted mt-1 text-sm">Used to fill in checkout faster.</p>
        </div>
        <Button
          variant="noir"
          onClick={() => modal.openModal('create')}
          disabled={addresses.length >= 10}
        >
          <Icon name="plus" size={15} /> Add address
        </Button>
      </div>

      {addresses.length === 0 ? (
        <EmptyState
          className="mt-6"
          title="No saved addresses"
          description="Add an address to speed up checkout."
        />
      ) : (
        <ul className="mt-6 grid gap-4 md:grid-cols-2">
          {addresses.map((a) => (
            <li key={a.id} className="border-line relative rounded-2xl border p-5">
              <div className="flex items-center gap-2">
                <p className="text-ink font-semibold">{a.label}</p>
                {a.isDefault && (
                  <span className="bg-brand-soft text-brand-ink rounded-full px-2 py-0.5 text-[11px] font-semibold">
                    Default
                  </span>
                )}
              </div>
              <p className="text-base-700 mt-2 text-sm leading-relaxed">
                {a.fullName} · {a.phone}
                <br />
                {a.addressLine}
                <br />
                {[a.area, a.city].filter(Boolean).join(', ')} · {SHIPPING_ZONE_LABELS[a.zone]}
              </p>
              <div className="mt-4 flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => modal.openModal('update', a)}>
                  <Icon name="pencil" size={14} /> Edit
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setDeleting(a)}>
                  <Icon name="trash" size={14} /> Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <AddressDialog
        key={modal.data?.id ?? modal.type ?? 'closed'}
        open={modal.isOpen()}
        address={modal.data}
        onOpenChange={(o) => !o && modal.closeModal()}
        onSaved={() => {
          modal.closeModal();
          router.refresh();
        }}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        tone="danger"
        title="Remove this address?"
        description={
          deleting ? `${deleting.label}: ${deleting.addressLine}, ${deleting.city}` : undefined
        }
        confirmLabel="Remove"
        onConfirm={async () => {
          if (!deleting) return;
          const res = await deleteAddressAction(deleting.id);
          if (handleActionResult(res)) router.refresh();
        }}
      />
    </section>
  );
}

function AddressDialog({
  open,
  address,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  address: AddressDTO | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const form = Form.useForm<AddressInput>({
    schema: addressSchema,
    defaultValues: address
      ? { ...address, division: address.division ?? '', area: address.area ?? '' }
      : {
          label: 'Home',
          fullName: '',
          phone: '',
          addressLine: '',
          division: '',
          city: '',
          area: '',
          zone: 'outside_dhaka',
          isDefault: false,
        },
  });
  const { isSubmitting } = form.formState;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <Form
          form={form}
          className="gap-0"
          onFinish={async (values) => {
            const res = await saveAddressAction(values, address?.id);
            if (handleActionResult(res, form)) onSaved();
          }}
        >
          <DialogHeader>
            <DialogTitle>{address ? 'Edit address' : 'New address'}</DialogTitle>
          </DialogHeader>
          <DialogBody className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
            <FormInput name="label" label="Label" placeholder="Home, Office…" />
            <FormInput name="fullName" label="Full name" placeholder="Receiver's name" required />
            <FormInput
              name="phone"
              label="Mobile number"
              placeholder="01XXXXXXXXX"
              required
              inputMode="tel"
            />
            <LocationFields />
            <FormInput
              name="addressLine"
              label="Address"
              placeholder="House, road, block / village"
              required
              className="sm:col-span-2"
            />
            <DeliveryZoneNote className="sm:col-span-2" />
            <div className="sm:col-span-2">
              <FormCheckbox name="isDefault" label="Use as my default address" />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="noir" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Save address'}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
