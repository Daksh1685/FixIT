import { appConfig } from '../../config/env';
import {
  AdditionalImageRequest,
  DeviceDiagnosis,
  DiagnosisConfidence,
  DiagnosisFinding,
  DiagnosisHighlight,
  ImageAnalysisResult,
} from '../../types/diagnosis';
import { ScanImage } from '../../types/scan';
import { apiClient, FixiTApiError, toApiError } from './client';

const CONFIDENCE_VALUES: DiagnosisConfidence[] = ['medium', 'high'];
const FINDING_VALUES: DiagnosisFinding[] = ['issue_found', 'no_issue_visible'];

export async function requestDiagnosis(
  image: ScanImage,
  signal: AbortSignal,
): Promise<ImageAnalysisResult> {
  if (!appConfig.apiBaseUrl) {
    throw new FixiTApiError(
      'FixiT is not connected to an analysis server. Set EXPO_PUBLIC_API_URL and restart Expo.',
      'API_NOT_CONFIGURED',
    );
  }

  const formData = new FormData();
  formData.append(
    'image',
    {
      name: image.fileName ?? `fixit-${image.source}.jpg`,
      type: image.mimeType ?? 'image/jpeg',
      uri: image.uri,
    } as unknown as Blob,
  );

  try {
    const response = await apiClient.post<unknown>('/api/diagnoses', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      signal,
    });

    if (!isImageAnalysisResult(response.data)) {
      throw new FixiTApiError(
        'FixiT received an invalid diagnosis response. Please try again.',
        'INVALID_API_RESPONSE',
      );
    }

    return response.data;
  } catch (error) {
    if (error instanceof FixiTApiError) {
      throw error;
    }

    throw toApiError(error);
  }
}

function isDeviceDiagnosis(value: unknown): value is DeviceDiagnosis {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const diagnosis = value as Partial<DeviceDiagnosis>;
  return (
    isText(diagnosis.device) &&
    isText(diagnosis.brand) &&
    isText(diagnosis.model) &&
    isFinding(diagnosis.finding) &&
    isText(diagnosis.issue) &&
    isConfidence(diagnosis.confidence) &&
    isTextList(diagnosis.causes) &&
    isTextList(diagnosis.fix_steps) &&
    isDiagnosisHighlight(diagnosis.highlight) &&
    isText(diagnosis.safety_note)
  );
}

function isDiagnosisHighlight(value: unknown): value is DiagnosisHighlight {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const highlight = value as Partial<DiagnosisHighlight>;
  return (
    isNormalizedNumber(highlight.x) &&
    isNormalizedNumber(highlight.y) &&
    isNormalizedNumber(highlight.width) &&
    highlight.width > 0 &&
    isNormalizedNumber(highlight.height) &&
    highlight.height > 0 &&
    highlight.x + highlight.width <= 1 &&
    highlight.y + highlight.height <= 1 &&
    isText(highlight.label)
  );
}

export function isAdditionalImageRequest(value: ImageAnalysisResult): value is AdditionalImageRequest {
  return value.confidence === 'low';
}

function isImageAnalysisResult(value: unknown): value is ImageAnalysisResult {
  return isAdditionalImageRequestPayload(value) || isDeviceDiagnosis(value);
}

function isAdditionalImageRequestPayload(value: unknown): value is AdditionalImageRequest {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const request = value as Partial<AdditionalImageRequest>;
  return (
    request.confidence === 'low' &&
    isText(request.missing_information) &&
    isText(request.suggested_photo)
  );
}

function isConfidence(value: unknown): value is DiagnosisConfidence {
  return typeof value === 'string' && CONFIDENCE_VALUES.includes(value as DiagnosisConfidence);
}

function isFinding(value: unknown): value is DiagnosisFinding {
  return typeof value === 'string' && FINDING_VALUES.includes(value as DiagnosisFinding);
}

function isText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isNormalizedNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
}

function isTextList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isText);
}
