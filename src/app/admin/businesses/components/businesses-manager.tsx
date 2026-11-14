'use client';

import * as React from 'react';
import { useRouter } from 'nextjs-toploader/app';

import { saveBusinessAction } from '@/actions/admin';
import { ImageUploader } from '@/features/uploads/image-uploader';
import type { BusinessDTO, ImageDTO } from '@/types';
import { Form, FormInput, FormItem, FormSwitch, FormTextarea } from '@components/form';
import { Icon } from '@components/icon/icon';
import { StatusBadge } from '@components/shared';
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
import { type BusinessInput, businessSchema } from '@lib/validators/management';

export function BusinessesManager({ businesses }: { businesses: BusinessDTO[] }) {
  const [editing, setEditing] = React.useState<BusinessDTO | 'new' | null>(null);

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button variant="primary" onClick={() => setEditing('new')}>
          <Icon name="plus" size={15} /> Add business
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {businesses.map((b) => (
          <section
            key={b.id}
            className="bg-panel hairline rounded-xl2 flex flex-col justify-between p-5"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  {b.logo?.url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={b.logo.url}
                      alt={b.name}
                      className="border-line bg-well size-10 shrink-0 rounded-lg border object-contain p-0.5"
                    />
                  )}
                  <div>
                    <h2 className="text-ink text-base font-semibold">{b.name}</h2>
                    <p className="text-subtle text-xs">
                      Slug: <code>{b.slug}</code> · Prefix: <code>{b.invoicePrefix}</code>
                    </p>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <StatusBadge
                    status={b.isPublicStorefront ? 'info' : 'neutral'}
                    label={b.isPublicStorefront ? 'Public Storefront' : 'Internal Only'}
                  />
                  <StatusBadge
                    status={b.isActive ? 'ok' : 'danger'}
                    label={b.isActive ? 'Active' : 'Inactive'}
                  />
                </div>
              </div>
              {b.description && (
                <p className="text-muted mt-3 text-[13px]">{b.description}</p>
              )}
              <div className="text-muted mt-3 space-y-0.5 text-[12px]">
                {b.phone && <p>Phone: {b.phone}</p>}
                {b.address && <p>Address: {b.address}</p>}
              </div>
            </div>

            <div className="border-line mt-4 flex items-center justify-between border-t pt-3 text-xs">
              <div className="text-muted flex gap-4">
                <span>
                  <strong className="text-ink">{b.productCount ?? 0}</strong> products
                </span>
                <span>
                  <strong className="text-ink">{b.orderCount ?? 0}</strong> orders
                </span>
              </div>
              <Button variant="secondary" size="sm" onClick={() => setEditing(b)}>
                <Icon name="pencil" size={13} /> Edit
              </Button>
            </div>
          </section>
        ))}
      </div>

      {editing && (
        <BusinessDialog
          business={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

function BusinessDialog({
  business,
  onClose,
}: {
  business?: BusinessDTO;
  onClose: () => void;
}) {
  const router = useRouter();
  const form = Form.useForm<BusinessInput>({
    schema: businessSchema,
    defaultValues: business
      ? {
          name: business.name,
          slug: business.slug,
          description: business.description ?? '',
          invoicePrefix: business.invoicePrefix,
          phone: business.phone ?? '',
          address: business.address ?? '',
          logo: business.logo ?? null,
          isActive: business.isActive,
        }
      : {
          name: '',
          slug: '',
          description: '',
          invoicePrefix: '',
          phone: '',
          address: '',
          logo: null,
          isActive: true,
        },
  });
  const { isSubmitting } = form.formState;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <Form
          form={form}
          onFinish={async (values) => {
            const res = await saveBusinessAction(values, business?.id);
            if (handleActionResult(res, form)) {
              onClose();
              router.refresh();
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>{business ? `Edit ${business.name}` : 'Add business / store'}</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <FormInput name="name" label="Business name" placeholder="e.g. Fashion Store" required />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormInput
                name="invoicePrefix"
                label="Invoice prefix"
                placeholder="e.g. FSH"
                required
              />
              {!business && (
                <FormInput
                  name="slug"
                  label="Slug (optional)"
                  placeholder="auto-generated"
                />
              )}
            </div>
            <FormInput name="phone" label="Support phone (for invoices)" placeholder="01XXXXXXXXX" />
            <FormInput name="address" label="Business address (for invoices)" />
            <FormItem name="logo" label="Logo (for invoices)">
              {(field) => (
                <ImageUploader
                  purpose="categories"
                  nameHint={form.watch('name')}
                  max={1}
                  value={field.value ? [field.value as ImageDTO] : []}
                  onChange={(imgs) => field.onChange(imgs[0] ?? null)}
                />
              )}
            </FormItem>
            <FormTextarea name="description" label="Description" rows={2} />
            {!business?.isPublicStorefront && (
              <FormSwitch name="isActive" label="Active" />
            )}
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
