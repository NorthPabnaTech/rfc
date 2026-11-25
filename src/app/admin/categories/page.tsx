'use client';

import * as React from 'react';

import { useI18n } from '@/i18n/provider';
import { usePlatformStore } from '@/stores/platform-store';
import type { Category } from '@/types/platform';
import { Form, FormInput, FormSelect, FormTextarea } from '@components/form';
import { Icon, type IconRegistryKey } from '@components/icon/icon';
import { ProductImage } from '@components/platform/product-image';
import { ConfirmDialog, PageHeader } from '@components/shared';
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
import { Dropdown } from '@components/ui/dropdown';
import { toast } from '@lib/toast';
import { categorySchema } from '@lib/validators/reseller';

const ICONS: IconRegistryKey[] = [
  'headphones',
  'smartphone',
  'shirt',
  'dress',
  'kitchen',
  'perfume',
  'baby',
  'dumbbell',
  'watch',
  'sofa',
  'diamond',
  'football',
  'box',
  'basket',
  'monitor',
  'leaf',
];

type Values = { name: string; nameBn: string; icon: string; description?: string };

export default function AdminCategoriesPage() {
  const { t, locale, num } = useI18n();
  const { categories, products, upsertCategory, deleteCategory } = usePlatformStore();
  const [editing, setEditing] = React.useState<Category | 'new' | null>(null);
  const [toDelete, setToDelete] = React.useState<Category | null>(null);

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('admin.categories.title')}
        description={t('admin.categories.subtitle')}

        actions={
          <Button variant="primary" onClick={() => setEditing('new')}>
            <Icon name="plus" size={16} />
            {t('admin.categories.add')}
          </Button>
        }
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {categories.map((c, i) => {
          const count = products.filter((p) => p.categoryId === c.id).length;
          return (
            <div key={c.id} className="bg-panel border-line rounded-2xl border p-5">
              <div className="flex items-start justify-between">
                <ProductImage
                  src={`art:${i}`}
                  alt=""
                  icon={c.icon}
                  className="size-12"
                  iconSize={22}
                />
                <Dropdown
                  items={[
                    { label: t('common.edit'), icon: 'pencil', onClick: () => setEditing(c) },
                    {
                      label: t('common.delete'),
                      icon: 'trash',
                      destructive: true,
                      onClick: () => setToDelete(c),
                    },
                  ]}
                >
                  <Button variant="ghost" size="icon-sm" aria-label={t('common.actions')}>
                    <Icon name="more" size={18} />
                  </Button>
                </Dropdown>
              </div>
              <h3 className="text-ink mt-4 font-bold">{locale === 'bn' ? c.nameBn : c.name}</h3>
              <p className="text-muted mt-0.5 text-xs">{locale === 'bn' ? c.name : c.nameBn}</p>
              <p className="text-muted mt-3 line-clamp-2 text-[14px]">{c.description}</p>
              <div className="border-line mt-4 flex items-center justify-between border-t pt-3 text-xs">
                <span className="text-muted">{t('common.products')}</span>
                <span className="num text-ink font-bold">{num(count)}</span>
              </div>
            </div>
          );
        })}
      </div>

      <CategoryDialog
        category={editing}
        onClose={() => setEditing(null)}
        onSave={(c) => {
          upsertCategory(c);
          toast.success(t('common.saved'));
          setEditing(null);
        }}
      />
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        tone="danger"
        destructive
        icon="trash"
        title={t('admin.categories.deleteTitle')}
        description={toDelete ? (locale === 'bn' ? toDelete.nameBn : toDelete.name) : ''}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        onConfirm={() => {
          if (!toDelete) return;
          const res = deleteCategory(toDelete.id);
          if (res.ok) toast.success(t('common.deleted'));
          else toast.error(t('admin.categories.inUse'));
          setToDelete(null);
        }}
      />
    </div>
  );
}

function CategoryDialog({
  category,
  onClose,
  onSave,
}: {
  category: Category | 'new' | null;
  onClose: () => void;
  onSave: (c: Category) => void;
}) {
  const { t } = useI18n();
  const schema = React.useMemo(() => categorySchema(t), [t]);
  const existing = category && category !== 'new' ? category : null;
  return (
    <Dialog open={!!category} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <Form<Values>
          key={existing?.id ?? 'new'}
          schema={schema}
          initialValues={existing ?? { name: '', nameBn: '', icon: 'box', description: '' }}
          onFinish={(v) =>
            onSave({
              id: existing?.id ?? `cat-${Date.now().toString(36)}`,
              slug: v.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
              name: v.name,
              nameBn: v.nameBn,
              icon: v.icon,
              description: v.description ?? '',
            })
          }
        >
          <DialogHeader>
            <DialogTitle>
              {existing ? t('admin.categories.edit') : t('admin.categories.add')}
            </DialogTitle>
            <DialogDescription>{t('admin.categories.subtitle')}</DialogDescription>
          </DialogHeader>
          <DialogBody className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
            <FormInput name="name" label={t('admin.categories.nameEn')} required />
            <FormInput name="nameBn" label={t('admin.categories.nameBn')} required />
            <FormSelect
              name="icon"
              label={t('admin.categories.icon')}
              className="sm:col-span-2"
              items={ICONS.map((i) => ({ value: i, label: i, icon: i }))}
            />
            <FormTextarea
              name="description"
              label={t('common.description')}
              rows={3}
              className="sm:col-span-2"
            />
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant="primary">
              {t('common.save')}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
