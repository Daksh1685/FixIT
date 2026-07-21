import multer from 'multer';

import { HttpError } from '../errors/http-error.js';

const ACCEPTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

export const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_IMAGE_SIZE_BYTES,
    files: 1,
  },
  fileFilter: (_request, file, callback) => {
    if (!ACCEPTED_IMAGE_TYPES.has(file.mimetype)) {
      callback(
        new HttpError(
          415,
          'UNSUPPORTED_MEDIA_TYPE',
          'Upload a JPEG, PNG, WebP, HEIC, or HEIF image.',
        ),
      );
      return;
    }

    callback(null, true);
  },
});
