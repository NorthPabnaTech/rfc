'use client';

import * as React from 'react';

import { submitReviewAction } from '@/actions/account';
import { ImageUploader } from '@/features/uploads/image-uploader';
import type { ImageDTO } from '@/types';
import { Form, FormItem, FormTextarea } from '@components/form';
import { Icon } from '@components/icon/icon';
import { Button } from '@components/ui/button';
import { handleActionResult } from '@lib/action-client';
import { cn } from '@lib/utils';
import { type ReviewInput, reviewSchema } from '@lib/validators/order';

export function ReviewForm({ productId, slug }: { productId: string; slug: string }) {
  const [open, setOpen] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const form = Form.useForm<ReviewInput>({
    schema: reviewSchema,
    defaultValues: { productId, rating: 0, comment: '', images: [] },
  });
  const { isSubmitting } = form.formState;

  if (done) {
    return (
      <p className="bg-cream text-ink flex items-center gap-2 rounded-2xl px-5 py-4 text-sm">
        <Icon name="checkCircle" size={18} className="text-[var(--status-ok-fg)]" /> Thank you! Your
        review is now live.
      </p>
    );
  }

  if (!open) {
    return (
      <Button variant="noir" size="lg" onClick={() => setOpen(true)}>
        <Icon name="pencil" size={15} /> Write a review
      </Button>
    );
  }

  return (
    <Form
      form={form}
      className="bg-cream rounded-2xl p-5"
      onFinish={async (values) => {
        const res = await submitReviewAction(values, slug);
        if (handleActionResult(res, form)) setDone(true);
      }}
    >
      <FormItem name="rating" label="Your rating" required>
        {(field) => <StarPicker value={Number(field.value) || 0} onChange={field.onChange} />}
      </FormItem>
      <FormTextarea
        name="comment"
        label="Your review"
        required
        placeholder="What did you like or dislike?"
        rows={4}
      />
      <FormItem name="images" label="Photos (optional)">
        {(field) => (
          <ImageUploader
            purpose="reviews"
            max={5}
            value={(field.value as ImageDTO[]) ?? []}
            onChange={field.onChange}
          />
        )}
      </FormItem>
      <div className="flex gap-2.5">
        <Button type="submit" variant="noir" size="lg" disabled={isSubmitting}>
          {isSubmitting ? 'Submitting…' : 'Submit review'}
        </Button>
        <Button type="button" variant="ghost" size="lg" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </Form>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = React.useState(0);
  const shown = hover || value;
  return (
    <div
      className="flex gap-1"
      role="radiogroup"
      aria-label="Rating"
      onMouseLeave={() => setHover(0)}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          onMouseEnter={() => setHover(n)}
          onClick={() => onChange(n)}
          className={cn(
            'transition-transform hover:scale-110',
            n <= shown ? 'text-warning-500' : 'text-base-200',
          )}
        >
          <svg width="30" height="30" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
            <path d="M10 1.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L10 14.9l-5.2 2.8 1-5.9L1.5 7.7l5.9-.8z" />
          </svg>
        </button>
      ))}
    </div>
  );
}
