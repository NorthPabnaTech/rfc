'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { deleteCategoryAction, saveCategoryAction } from '@/actions/admin';
import { ProductImage } from '@/features/products/product-image';
import { ImageUploader } from '@/features/uploads/image-uploader';
import type { CategoryDTO, ImageDTO } from '@/types';
import { Form, FormInput, FormItem, FormSelect, FormSwitch, FormTextarea } from '@components/form';
import { Icon } from '@components/icon/icon';
import { ConfirmDialog, EmptyState, StatusBadge } from '@components/shared';
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
import { cn } from '@lib/utils';
import { type CategoryInput, categorySchema } from '@lib/validators/catalog';

export function CategoriesManager({ categories }: { categories: CategoryDTO[] }) {
  const router = useRouter();
  const modal = useModal<{ category?: CategoryDTO; parentId?: string }>();
  const [deleting, setDeleting] = React.useState<CategoryDTO | null>(null);
  const roots = categories.filter((c) => !c.parentId);

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button variant="primary" onClick={() => modal.openModal('create', {})}>
          <Icon name="plus" size={15} /> Add category
        </Button>
      </div>

      {roots.length === 0 ? (
        <EmptyState
          title="No categories yet"
          description="Create your first category to start adding products."
        />
      ) : (
        <div className="grid gap-4">
          {roots.map((root) => {
            const subs = categories.filter((c) => c.parentId === root.id);
            return (
              <div key={root.id} className="bg-panel hairline rounded-xl2 overflow-hidden">
                <Row
                  category={root}
                  onEdit={() => modal.openModal('update', { category: root })}
                  onDelete={() => setDeleting(root)}
                  extra={
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => modal.openModal('create', { parentId: root.id })}
                    >
                      <Icon name="plus" size={13} /> Sub-category
                    </Button>
                  }
                />
                {subs.length > 0 && (
                  <ul className="border-line divide-line divide-y border-t">
                    {subs.map((s) => (
                      <li key={s.id} className="pl-10">
                        <Row
                          category={s}
                          sub
                          onEdit={() => modal.openModal('update', { category: s })}
                          onDelete={() => setDeleting(s)}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}

      <CategoryDialog
        key={`${modal.type}-${modal.data?.category?.id ?? modal.data?.parentId ?? 'new'}`}
        open={modal.isOpen()}
        category={modal.data?.category}
        parentId={modal.data?.parentId}
        roots={roots}
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
        title={`Delete “${deleting?.name}”?`}
        description="Only empty categories can be deleted. Move its products and sub-categories first."
        confirmLabel="Delete"
        onConfirm={async () => {
          if (!deleting) return;
          const res = await deleteCategoryAction(deleting.id);
          if (handleActionResult(res)) router.refresh();
        }}
      />
    </>
  );
}

function Row({
  category: c,
  sub,
  onEdit,
  onDelete,
  extra,
}: {
  category: CategoryDTO;
  sub?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  extra?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3">
      <span
        className={cn(
          'bg-well relative shrink-0 overflow-hidden rounded-lg',
          sub ? 'size-9' : 'size-11',
        )}
      >
        {c.image ? (
          <ProductImage src={c.image.url} alt="" fill sizes="44px" />
        ) : (
          <Icon name="folder" size={16} className="text-subtle absolute inset-0 m-auto" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className={cn('text-ink truncate', sub ? 'text-[13px]' : 'font-semibold')}>{c.name}</p>
        <p className="text-subtle text-[11.5px]">
          /{c.slug} · {c.productCount ?? 0} products
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        {c.isFeatured && <StatusBadge status="info" label="Featured" />}
        {!c.isActive && <StatusBadge status="neutral" label="Hidden" />}
        {extra}
        <Button size="icon-sm" variant="ghost" aria-label={`Edit ${c.name}`} onClick={onEdit}>
          <Icon name="pencil" size={15} />
        </Button>
        <Button size="icon-sm" variant="ghost" aria-label={`Delete ${c.name}`} onClick={onDelete}>
          <Icon name="trash" size={15} />
        </Button>
      </div>
    </div>
  );
}

function CategoryDialog({
  open,
  category,
  parentId,
  roots,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  category?: CategoryDTO;
  parentId?: string;
  roots: CategoryDTO[];
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
}) {
  const form = Form.useForm<CategoryInput>({
    schema: categorySchema,
    defaultValues: {
      name: category?.name ?? '',
      slug: category?.slug ?? '',
      description: category?.description ?? '',
      parent: category?.parentId ?? parentId ?? '',
      image: category?.image ?? null,
      isActive: category?.isActive ?? true,
      isFeatured: category?.isFeatured ?? false,
      sortOrder: category?.sortOrder ?? 0,
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
            const res = await saveCategoryAction(values, category?.id);
            if (handleActionResult(res, form)) onSaved();
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {category ? 'Edit category' : parentId ? 'New sub-category' : 'New category'}
            </DialogTitle>
          </DialogHeader>
          <DialogBody className="grid gap-x-4 gap-y-5">
            <FormInput name="name" label="Name" required />
            <FormSelect
              name="parent"
              label="Parent category"
              placeholder="None — top-level category"
              clearable
              onClear={() => form.setValue('parent', '')}
              items={roots
                .filter((r) => r.id !== category?.id)
                .map((r) => ({ value: r.id, label: r.name }))}
            />
            <FormTextarea name="description" label="Description" rows={2} />
            <FormItem name="image" label="Image">
              {(field) => (
                <ImageUploader
                  purpose="categories"
                  max={1}
                  value={field.value ? [field.value as ImageDTO] : []}
                  onChange={(imgs) => field.onChange(imgs[0] ?? null)}
                />
              )}
            </FormItem>
            <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
              <FormInput name="slug" label="URL slug" placeholder="auto" />
              <FormInput name="sortOrder" label="Sort order" type="number" />
            </div>
            <FormSwitch name="isActive" label="Visible in store" />
            <FormSwitch name="isFeatured" label="Feature on homepage" />
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
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
