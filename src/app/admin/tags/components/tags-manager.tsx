'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { deleteTagAction, saveTagAction } from '@/actions/admin';
import type { TagDTO } from '@/types';
import { Form, FormInput } from '@components/form';
import { Icon } from '@components/icon/icon';
import { ConfirmDialog, EmptyState } from '@components/shared';
import { Button } from '@components/ui/button';
import { handleActionResult } from '@lib/action-client';
import { type TagInput, tagSchema } from '@lib/validators/catalog';

export function TagsManager({ tags }: { tags: TagDTO[] }) {
  const router = useRouter();
  const [editing, setEditing] = React.useState<TagDTO | null>(null);
  const [deleting, setDeleting] = React.useState<TagDTO | null>(null);
  const form = Form.useForm<TagInput>({ schema: tagSchema, defaultValues: { name: '' } });
  const { isSubmitting } = form.formState;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
      <div className="bg-panel hairline rounded-xl2 h-fit p-5">
        <h2 className="text-ink mb-4 font-semibold">
          {editing ? `Rename “${editing.name}”` : 'New tag'}
        </h2>
        <Form
          form={form}
          onFinish={async (values) => {
            const res = await saveTagAction(values, editing?.id);
            if (handleActionResult(res, form)) {
              form.reset({ name: '' });
              setEditing(null);
              router.refresh();
            }
          }}
        >
          <FormInput name="name" label="Tag name" required placeholder="e.g. Gift idea" />
          <div className="flex gap-2">
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {editing ? 'Save' : 'Add tag'}
            </Button>
            {editing && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setEditing(null);
                  form.reset({ name: '' });
                }}
              >
                Cancel
              </Button>
            )}
          </div>
        </Form>
      </div>

      {tags.length === 0 ? (
        <EmptyState title="No tags yet" description="Tags help customers find related products." />
      ) : (
        <div className="bg-panel hairline rounded-xl2 p-5">
          <ul className="flex flex-wrap gap-2">
            {tags.map((t) => (
              <li
                key={t.id}
                className="border-line flex items-center gap-1 rounded-full border bg-white py-1 pr-1 pl-3.5"
              >
                <span className="text-ink text-[13px] font-medium">{t.name}</span>
                <span className="text-subtle text-[11px]">({t.productCount ?? 0})</span>
                <button
                  type="button"
                  className="text-subtle hover:text-ink hover:bg-well ml-1 grid size-7 place-items-center rounded-full"
                  aria-label={`Rename ${t.name}`}
                  onClick={() => {
                    setEditing(t);
                    form.reset({ name: t.name });
                  }}
                >
                  <Icon name="pencil" size={13} />
                </button>
                <button
                  type="button"
                  className="text-subtle hover:text-ink hover:bg-well grid size-7 place-items-center rounded-full"
                  aria-label={`Delete ${t.name}`}
                  onClick={() => setDeleting(t)}
                >
                  <Icon name="x" size={13} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        tone="danger"
        title={`Delete tag “${deleting?.name}”?`}
        description="It will be removed from every product that uses it."
        confirmLabel="Delete"
        onConfirm={async () => {
          if (!deleting) return;
          const res = await deleteTagAction(deleting.id);
          if (handleActionResult(res)) router.refresh();
        }}
      />
    </div>
  );
}
