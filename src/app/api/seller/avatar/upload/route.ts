import { NextRequest, NextResponse } from 'next/server';

import { connectDB, MediaAssetModel } from '@/database';
import { requireRequestUser } from '@/server/request-auth';
import { destroyCloudinaryResource, uploadImageWithMeta } from '@lib/cloudinary';
import { UPLOAD_FOLDERS } from '@lib/constants';
import { AppError } from '@lib/errors';

/*
 * Seller avatar upload/removal. Both need a signed-in seller. Every avatar's
 * public id embeds its owner (`reseller_avatar_<owner>_<random>`), so a
 * seller can only delete their own images.
 */

const ownerKey = (id: string) => id.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40);
const ownerPrefix = (id: string) => `${UPLOAD_FOLDERS.users}/reseller_avatar_${ownerKey(id)}_`;

function extractUserPublicId(url: string): string | null {
  const cleanUrl = url.split('?')[0]?.split('#')[0] ?? '';
  const folder = UPLOAD_FOLDERS.users;
  const idx = cleanUrl.indexOf(`${folder}/`);
  if (idx === -1) return null;
  return cleanUrl.slice(idx).replace(/\.[^/.]+$/, '');
}

function errorResponse(err: unknown, fallback: string) {
  const message = err instanceof AppError ? err.message : fallback;
  const status = err instanceof AppError ? err.status : 500;
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireRequestUser(req, ['seller']);
    const body = (await req.json().catch(() => null)) as { url?: string } | null;
    const url = body?.url?.trim();
    if (!url) return NextResponse.json({ ok: true, deleted: false });

    const publicId = extractUserPublicId(url);
    // Not one of this seller's avatars (older uploads, someone else's image…): leave it alone.
    if (!publicId || !publicId.startsWith(ownerPrefix(user.id))) {
      return NextResponse.json({ ok: true, deleted: false });
    }
    await destroyCloudinaryResource(publicId);
    await connectDB();
    await MediaAssetModel.deleteMany({ publicId });
    return NextResponse.json({ ok: true, deleted: true });
  } catch (err) {
    return errorResponse(err, 'Failed to remove previous image.');
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireRequestUser(req, ['seller']);
    const formData = await req.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: 'Image file is required.' }, { status: 400 });
    }

    const meta = await uploadImageWithMeta(file, 'users', `reseller-avatar-${ownerKey(user.id)}`);
    return NextResponse.json({ ok: true, url: meta.asset.url });
  } catch (err) {
    return errorResponse(err, 'Failed to upload image.');
  }
}
