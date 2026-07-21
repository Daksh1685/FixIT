import type { RequestHandler } from 'express';

import { HttpError } from '../errors/http-error.js';
import { diagnoseDevice } from '../services/diagnosis.service.js';

export const createDiagnosis: RequestHandler = async (request, response) => {
  if (!request.file) {
    throw new HttpError(400, 'IMAGE_REQUIRED', 'Send one image in the image form field.');
  }

  const diagnosis = await diagnoseDevice(request.file.buffer);
  response.status(200).json(diagnosis);
};
