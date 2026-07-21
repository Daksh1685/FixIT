import axios from 'axios';

import { appConfig } from '../../config/env';

export const apiClient = axios.create({
  baseURL: appConfig.apiBaseUrl ?? undefined,
  headers: {
    Accept: 'application/json',
  },
  timeout: 45_000,
});

export class FixiTApiError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'FixiTApiError';
  }
}

export function isRequestCancelled(error: unknown): boolean {
  return axios.isCancel(error) || (axios.isAxiosError(error) && error.code === 'ERR_CANCELED');
}

export function toApiError(error: unknown): FixiTApiError {
  if (error instanceof FixiTApiError) {
    return error;
  }

  if (axios.isAxiosError(error)) {
    const payload = error.response?.data;
    const apiError = isApiErrorPayload(payload) ? payload.error : undefined;

    return new FixiTApiError(
      apiError?.message ?? 'We could not reach FixiT. Check your connection and try again.',
      apiError?.code,
      error.response?.status,
    );
  }

  return new FixiTApiError('We could not analyze this image. Please try again.');
}

type ApiErrorPayload = {
  error: {
    code: string;
    message: string;
  };
};

function isApiErrorPayload(value: unknown): value is ApiErrorPayload {
  if (!value || typeof value !== 'object' || !('error' in value)) {
    return false;
  }

  const { error } = value as { error?: unknown };
  return (
    !!error &&
    typeof error === 'object' &&
    'code' in error &&
    typeof error.code === 'string' &&
    'message' in error &&
    typeof error.message === 'string'
  );
}
