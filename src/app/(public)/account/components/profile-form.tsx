'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { updateProfileAction } from '@/actions/account';
import { ProductImage } from '@/features/products/product-image';
import { ImageCropDialog } from '@/features/uploads/image-crop-dialog';
import { uploadFiles } from '@/features/uploads/image-uploader';
import type { ProfileDTO } from '@/types';
import { Form, FormInput } from '@components/form';
import { Icon } from '@components/icon/icon';
import { ConfirmDialog, Spinner } from '@components/shared';
import { Callout } from '@components/shared/callout';
import { Button } from '@components/ui/button';
import { handleActionResult } from '@lib/action-client';
import { ACCEPTED_IMAGE_TYPES } from '@lib/constants';
import { toast } from '@lib/toast';
import { type ProfileInput, profileSchema } from '@lib/validators/auth';

export function ProfileForm({ profile }: { profile: ProfileDTO }) {
  const router = useRouter();
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [removing, setRemoving] = React.useState(false);
  const [confirmRemove, setConfirmRemove] = React.useState(false);
  const [pendingAvatar, setPendingAvatar] = React.useState<File[]>([]);
  const form = Form.useForm<ProfileInput>({
    schema: profileSchema,
    defaultValues: {
      name: profile.name,
      phone: profile.phone ?? '',
      email: profile.email ?? '',
      avatar: profile.avatar ?? null,
    },
  });
  const avatar = form.watch('avatar');
  const { isSubmitting, isDirty } = form.formState;

  const onPick = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast.error('Unsupported image', { description: 'Use JPG, PNG, WebP or AVIF.' });
      return;
    }
    setPendingAvatar([file]);
    if (fileRef.current) fileRef.current.value = '';
  };

  const uploadCroppedAvatar = async (optimizedFiles: File[]) => {
    const file = optimizedFiles[0];
    if (!file) return;
    setPendingAvatar([]);
    setUploading(true);
    try {
      const [img] = await uploadFiles([file], 'users', form.getValues('name'));
      form.setValue('avatar', img ?? null, { shouldDirty: true });
    } catch (e) {
      toast.error('Upload failed', { description: e instanceof Error ? e.message : undefined });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Form
      form={form}
      className="mt-6"
      onFinish={async (values) => {
        const res = await updateProfileAction(values);
        if (handleActionResult(res, form)) {
          form.reset(values);
          router.refresh();
        }
      }}
    >
      <div className="flex items-center gap-5">
        <div className="relative size-20 shrink-0">
          <span className="bg-cream relative grid size-full place-items-center overflow-hidden rounded-full">
            {avatar?.url ? (
              <ProductImage src={avatar.url} alt="Profile photo" fill sizes="80px" />
            ) : (
              <span className="font-display text-accent text-3xl">{profile.name.charAt(0)}</span>
            )}
            {uploading && (
              <span className="absolute inset-0 grid place-items-center bg-white/70">
                <Spinner size="md" />
              </span>
            )}
          </span>
          {avatar?.url && !uploading && (
            <button
              type="button"
              aria-label="Remove profile photo"
              title="Remove photo"
              onClick={() => setConfirmRemove(true)}
              className="absolute -top-1 -right-1 grid size-6 place-items-center rounded-full bg-red-600 text-white shadow ring-2 ring-white transition hover:bg-red-700"
            >
              <Icon name="trash" size={12} />
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            <Icon name="camera" size={15} /> {avatar ? 'Change photo' : 'Upload photo'}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => void onPick(e.target.files)}
          />
        </div>
      </div>
      <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
        <FormInput name="name" label="Full name" placeholder="e.g. Rahim Uddin" required />
        <FormInput
          name="phone"
          label="Mobile number"
          placeholder="01XXXXXXXXX"
          required
          inputMode="tel"
        />
        <FormInput
          name="email"
          label="Email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          disabled={Boolean(profile.email)}
          required
        />
      </div>
      {!profile.email && (
        <Callout tone="warn" title="Add your email">
          Without an email you can&apos;t reset your password if you forget it.
        </Callout>
      )}
      <div>
        <Button
          type="submit"
          variant="noir"
          size="lg"
          disabled={isSubmitting || uploading || !isDirty}
        >
          {isSubmitting ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
      <ImageCropDialog
        open={pendingAvatar.length > 0}
        files={pendingAvatar}
        purpose="users"
        onCancel={() => setPendingAvatar([])}
        onConfirm={uploadCroppedAvatar}
      />
      <ConfirmDialog
        open={confirmRemove}
        onOpenChange={setConfirmRemove}
        tone="danger"
        title="Remove profile photo?"
        description="Your current profile photo will be deleted."
        confirmLabel="Remove photo"
        cancelLabel="Keep photo"
        loading={removing}
        autoClose={false}
        onConfirm={async () => {
          setRemoving(true);
          try {
            if (avatar?.type === 'cloudinary' && avatar.publicId) {
              await fetch('/api/upload', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ publicId: avatar.publicId, purpose: 'users' }),
              }).catch(() => {});
            }
            form.setValue('avatar', null, { shouldDirty: true });
          } finally {
            setRemoving(false);
            setConfirmRemove(false);
          }
        }}
      />
    </Form>
  );
}
