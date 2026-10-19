import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getCurrentUser } from '@lib/auth/current-user';
import { uploadImages } from '@lib/cloudinary';
import { UPLOAD_FOLDERS, type UploadPurpose } from '@lib/constants';
import { AppError } from '@lib/errors';

/** Who may upload into which Cloudinary folder, and how many files at once. */
const RULES: Record<UploadPurpose, { adminOnly: boolean; maxFiles: number }> = {
  products: { adminOnly: true, maxFiles: 10 },
  categories: { adminOnly: true, maxFiles: 1 },
  banners: { adminOnly: true, maxFiles: 6 },
  users: { adminOnly: false, maxFiles: 1 },
  reviews: { adminOnly: false, maxFiles: 5 },
  returns: { adminOnly: false, maxFiles: 5 },
};

const purposeSchema = z.enum(Object.keys(UPLOAD_FOLDERS) as [UploadPurpose, ...UploadPurpose[]]);

/**
 * POST multipart/form-data { purpose, files[] } → { images: ImageAsset[] }.
 * Files go straight to Cloudinary (resized on ingest); the client then
 * submits the returned assets with its form, where server actions verify
 * they belong to our cloud and the right folder.
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AppError('Please sign in to upload images.', 401);

    const form = await request.formData();
    const purpose = purposeSchema.parse(form.get('purpose'));
    const rule = RULES[purpose];
    if (rule.adminOnly && user.role !== 'admin') throw new AppError('Not allowed.', 403);

    const files = form.getAll('files').filter((f): f is File => f instanceof File && f.size > 0);
    if (files.length === 0) throw new AppError('Choose at least one image.');
    if (files.length > rule.maxFiles)
      throw new AppError(`Upload at most ${rule.maxFiles} image(s) at a time.`);

    const images = await uploadImages(files, purpose);
    return NextResponse.json({ images });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid upload purpose.' }, { status: 400 });
    }
    console.error('[upload]', error);
    return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 });
  }
}
