import { NextRequest, NextResponse } from 'next/server';

import { connectDB, MediaAssetModel } from '@/database';
import { destroyCloudinaryResource, uploadImageWithMeta } from '@lib/cloudinary';
import { UPLOAD_FOLDERS } from '@lib/constants';
import { AppError } from '@lib/errors';

function extractOwnUserPublicId(url: string): string | null {
  const cleanUrl = url.split('?')[0]?.split('#')[0] ?? '';
  const folder = UPLOAD_FOLDERS.users;
  const idx = cleanUrl.indexOf(`${folder}/`);
  if (idx === -1) return null;
  return cleanUrl.slice(idx).replace(/\.[^/.]+$/, '');
}

export async function DELETE(req: NextRequest) {
  try {
    const body = (await req.json()) as { url?: string };
    const url = body.url?.trim();
    if (!url) {
      return NextResponse.json({ ok: true, deleted: false });
    }
    const publicId = extractOwnUserPublicId(url);
    if (!publicId) {
      return NextResponse.json({ ok: true, deleted: false });
    }
    await destroyCloudinaryResource(publicId);
    await connectDB();
    await MediaAssetModel.deleteMany({ publicId });
    return NextResponse.json({ ok: true, deleted: true, publicId });
  } catch (err) {
    const message = err instanceof AppError ? err.message : 'Failed to remove previous image.';
    const status = err instanceof AppError ? err.status : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: 'Image file is required.' }, { status: 400 });
    }

    const meta = await uploadImageWithMeta(file, 'users', 'reseller-avatar');
    return NextResponse.json({ ok: true, url: meta.asset.url });
  } catch (err) {
    const message = err instanceof AppError ? err.message : 'Failed to upload image.';
    const status = err instanceof AppError ? err.status : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
