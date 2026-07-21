import type { ErrorRequestHandler, RequestHandler } from 'express';
import multer from 'multer';

import { HttpError } from '../errors/http-error.js';

export const notFoundHandler: RequestHandler = (request, response) => {
  response.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Route ${request.method} ${request.path} was not found.`,
    },
  });
};

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof HttpError) {
    response.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
      },
    });
    return;
  }

  if (error instanceof multer.MulterError) {
    const isTooLarge = error.code === 'LIMIT_FILE_SIZE';
    response.status(isTooLarge ? 413 : 400).json({
      error: {
        code: isTooLarge ? 'IMAGE_TOO_LARGE' : 'INVALID_UPLOAD',
        message: isTooLarge
          ? 'The image must be 10 MB or smaller.'
          : 'Send exactly one image in the image form field.',
      },
    });
    return;
  }

  if (error instanceof SyntaxError && 'body' in error) {
    response.status(400).json({
      error: {
        code: 'INVALID_JSON',
        message: 'The request body contains invalid JSON.',
      },
    });
    return;
  }

  console.error('Unhandled API error', error);
  response.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred.',
    },
  });
};
