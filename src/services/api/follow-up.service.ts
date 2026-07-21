import { appConfig } from '../../config/env';
import { DeviceDiagnosis, FollowUpMessage } from '../../types/diagnosis';
import { apiClient, FixiTApiError, toApiError } from './client';

type FollowUpResponse = {
  answer: string;
};

export async function requestFollowUp(
  diagnosis: DeviceDiagnosis,
  messages: FollowUpMessage[],
  question: string,
  signal: AbortSignal,
): Promise<string> {
  if (!appConfig.apiBaseUrl) {
    throw new FixiTApiError(
      'FixiT is not connected to an analysis server. Set EXPO_PUBLIC_API_URL and restart Expo.',
      'API_NOT_CONFIGURED',
    );
  }

  try {
    const response = await apiClient.post<unknown>(
      '/api/diagnoses/follow-up',
      {
        diagnosis,
        messages: messages.map(({ content, role }) => ({ content, role })),
        question,
      },
      { signal },
    );

    if (!isFollowUpResponse(response.data)) {
      throw new FixiTApiError(
        'FixiT received an invalid follow-up response. Please try again.',
        'INVALID_API_RESPONSE',
      );
    }

    return response.data.answer;
  } catch (error) {
    if (error instanceof FixiTApiError) {
      throw error;
    }

    throw toApiError(error);
  }
}

function isFollowUpResponse(value: unknown): value is FollowUpResponse {
  if (!value || typeof value !== 'object' || !('answer' in value)) {
    return false;
  }

  const { answer } = value as { answer?: unknown };
  return typeof answer === 'string' && answer.trim().length > 0;
}
