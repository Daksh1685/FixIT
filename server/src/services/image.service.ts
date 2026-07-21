import sharp from 'sharp';

import { HttpError } from '../errors/http-error.js';

const MAX_DIMENSION = 1600;

/** Normalizes all supported uploads to a smaller, correctly oriented JPEG for inference. */
export async function compressImage(image: Buffer): Promise<Buffer> {
  try {
    return await sharp(image, { failOn: 'error', limitInputPixels: 40_000_000 })
      .rotate()
      .resize({
        width: MAX_DIMENSION,
        height: MAX_DIMENSION,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();
  } catch {
    throw new HttpError(422, 'INVALID_IMAGE', 'The uploaded file is not a valid image.');
  }
}
