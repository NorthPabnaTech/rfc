'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { requestReturnAction } from '@/actions/account';
import { ImageUploader } from '@/features/uploads/image-uploader';
import type { ImageDTO } from '@/types';
import { Form, FormItem, FormSelect, FormTextarea } from '@components/form';
import { Icon } from '@components/icon/icon';
import { Button } from '@components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@components/ui/dialog';
import { handleActionResult } from '@lib/action-client';
import { RETURN_REASONS } from '@lib/constants';
import { type ReturnRequestInput, returnRequestSchema } from '@lib/validators/order';

export function ReturnRequestDialog({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const form = Form.useForm<ReturnRequestInput>({
    schema: returnRequestSchema,
    defaultValues: { orderId, description: '', images: [] },
  });
  const { isSubmitting } = form.formState;

  return (
    <>
      <Button variant="noir" size="sm" onClick={() => setOpen(true)}>
        <Icon name="refresh" size={14} /> Request return
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <Form
            form={form}
            className="gap-0"
            onFinish={async (values) => {
              const res = await requestReturnAction(values);
              if (handleActionResult(res, form)) {
                setOpen(false);
                router.refresh();
              }
            }}
          >
            <DialogHeader>
              <DialogTitle>Request a return</DialogTitle>
              <DialogDescription>
                Tell us what went wrong. Photos help us resolve it faster.
              </DialogDescription>
            </DialogHeader>
            <DialogBody className="grid gap-x-4 gap-y-5">
              <FormSelect
                name="reason"
                label="Reason"
                required
                placeholder="Choose a reason"
                items={RETURN_REASONS.map((r) => ({ value: r, label: r }))}
              />
              <FormTextarea
                name="description"
                label="Details"
                rows={4}
                placeholder="Describe the issue…"
              />
              <FormItem name="images" label="Photos (optional, up to 5)">
                {(field) => (
                  <ImageUploader
                    purpose="returns"
                    max={5}
                    value={(field.value as ImageDTO[]) ?? []}
                    onChange={field.onChange}
                  />
                )}
              </FormItem>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="noir" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting…' : 'Submit request'}
              </Button>
            </DialogFooter>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
