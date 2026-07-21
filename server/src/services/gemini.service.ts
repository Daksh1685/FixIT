import { ApiError, GoogleGenAI } from '@google/genai';

import { env } from '../config/env.js';
import { HttpError } from '../errors/http-error.js';

export function createGeminiClient(): GoogleGenAI {
  if (!env.geminiApiKey) {
    throw new HttpError(500, 'GEMINI_NOT_CONFIGURED', 'The analysis service is not configured.');
  }

  return new GoogleGenAI({ apiKey: env.geminiApiKey });
}

export function mapGeminiError(error: unknown): never {
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) {
      throw new HttpError(502, 'GEMINI_AUTH_ERROR', 'The analysis service could not authenticate.');
    }

    if (error.status === 429) {
      throw new HttpError(429, 'GEMINI_RATE_LIMITED', 'The analysis service is busy. Please try again shortly.');
    }

    if (error.status >= 500) {
      throw new HttpError(503, 'GEMINI_UNAVAILABLE', 'The analysis service is temporarily unavailable.');
    }

    throw new HttpError(502, 'GEMINI_API_ERROR', 'The analysis service could not complete the request.');
  }

  if (error instanceof TypeError) {
    throw new HttpError(503, 'GEMINI_UNAVAILABLE', 'The analysis service is temporarily unavailable.');
  }

  throw error;
}
