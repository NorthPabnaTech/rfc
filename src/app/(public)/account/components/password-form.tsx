'use client';

import { changePasswordAction } from '@/actions/account';
import { Form, FormPassword } from '@components/form';
import { Button } from '@components/ui/button';
import { handleActionResult } from '@lib/action-client';
import { type ChangePasswordInput, changePasswordSchema } from '@lib/validators/auth';

const EMPTY = { currentPassword: '', newPassword: '', confirmPassword: '' };

export function PasswordForm() {
  const form = Form.useForm<ChangePasswordInput>({
    schema: changePasswordSchema,
    defaultValues: EMPTY,
  });
  const { isSubmitting } = form.formState;
  return (
    <Form
      form={form}
      className="mt-6 max-w-md"
      onFinish={async (values) => {
        const res = await changePasswordAction(values);
        if (handleActionResult(res, form)) form.reset(EMPTY);
      }}
    >
      <FormPassword
        name="currentPassword"
        label="Current password"
        autoComplete="current-password"
        required
      />
      <FormPassword
        name="newPassword"
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
      <div>
        <Button type="submit" variant="secondary" size="lg" disabled={isSubmitting}>
          {isSubmitting ? 'Updating…' : 'Update password'}
        </Button>
      </div>
    </Form>
  );
}
