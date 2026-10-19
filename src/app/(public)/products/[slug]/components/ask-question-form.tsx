'use client';

import { z } from 'zod';

import { askQuestionAction } from '@/actions/account';
import { Form, FormTextarea } from '@components/form';
import { Button } from '@components/ui/button';
import { handleActionResult } from '@lib/action-client';
import { questionSchema } from '@lib/validators/order';

type Values = z.input<typeof questionSchema>;

export function AskQuestionForm({ productId, slug }: { productId: string; slug: string }) {
  const form = Form.useForm<Values>({
    schema: questionSchema,
    defaultValues: { productId, question: '' },
  });
  const { isSubmitting } = form.formState;

  return (
    <Form
      form={form}
      className="gap-3"
      onFinish={async (values) => {
        const res = await askQuestionAction(values, slug);
        if (handleActionResult(res, form)) form.reset({ productId, question: '' });
      }}
    >
      <FormTextarea
        name="question"
        label="Ask a question about this product"
        placeholder="e.g. Is this available in other colours?"
        rows={3}
      />
      <div>
        <Button type="submit" variant="noir" size="lg" disabled={isSubmitting}>
          {isSubmitting ? 'Sending…' : 'Ask question'}
        </Button>
      </div>
    </Form>
  );
}
