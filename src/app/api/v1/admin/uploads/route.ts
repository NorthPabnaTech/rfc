import { AppError } from '@lib/errors';

import { handler, ok } from '@/server/http';
import { uploadProductImages } from '@/server/services/uploads';
import { requireAdmin } from '@/server/session';

export const POST = handler(async (req) => {
  await requireAdmin();
  const form = await req.formData().catch(() => {
    throw new AppError('Send the images as multipart/form-data.', 400);
  });
  const files = form.getAll('files').filter((f): f is File => f instanceof File);
  return ok({ urls: await uploadProductImages(files) }, 201);
});
