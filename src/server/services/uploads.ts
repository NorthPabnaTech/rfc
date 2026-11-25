import 'server-only';

import { v2 as cloudinary } from 'cloudinary';

// Importing lib/cloudinary configures the SDK from CLOUDINARY_* env vars.
import { assertValidImage } from '@lib/cloudinary';
import { AppError } from '@lib/errors';

const FOLDER = 'GadgetResell/products';
const MAX_FILES = 8;

/** Uploads product images (admin) and returns their HTTPS URLs. */
export async function uploadProductImages(files: File[]): Promise<string[]> {
  if (!files.length) throw new AppError('Choose at least one image.', 422);
  if (files.length > MAX_FILES) throw new AppError(`Upload at most ${MAX_FILES} images at a time.`, 422);
  files.forEach(assertValidImage);
  return Promise.all(
    files.map(async (file) => {
      const buffer = Buffer.from(await file.arrayBuffer());
      const res = await new Promise<{ secure_url: string }>((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            {
              folder: FOLDER,
              resource_type: 'image',
              // Cap the stored original; delivery sizing happens per request.
              transformation: [{ width: 2000, height: 2000, crop: 'limit' }],
            },
            (error, result) => (error || !result ? reject(error) : resolve(result)),
          )
          .end(buffer);
      });
      return res.secure_url;
    }),
  );
}
