'use client';

import { useRouter } from 'nextjs-toploader/app';

import { resetPasswordAction } from '@/actions/auth';
import { Form, FormPassword } from '@components/form';
import { Button } from '@components/ui/button';
import { handleActionResult } from '@lib/action-client';
import { type ResetPasswordInput, resetPasswordSchema } from '@lib/validators/auth';

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const form = Form.useForm<ResetPasswordInput>({
    schema: resetPasswordSchema,
    defaultValues: { token, password: '', confirmPassword: '' },
  });
  const { isSubmitting } = form.formState;

  return (
    <Form
      form={form}
      className="mt-8"
      onFinish={async (values) => {
        const res = await resetPasswordAction(values);
        if (handleActionResult(res, form)) {
          router.replace(res.data.redirectTo);
          router.refresh();
        }
      }}
    >
      <FormPassword
        name="password"
        label="New password"
        autoComplete="new-password"
        hint="At least 8 characters"
        required
      />
      <FormPassword
        name="confirmPassword"
        label="Confirm new password"
        autoComplete="new-password"
        required
      />
      <Button
        type="submit"
        variant="noir"
        size="xl"
        className="mt-2 w-full"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Saving…' : 'Save new password'}
      </Button>
    </Form>
  );
}
