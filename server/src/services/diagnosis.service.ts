import { env } from '../config/env.js';
import { HttpError } from '../errors/http-error.js';
import { DEVICE_DIAGNOSIS_SYSTEM_PROMPT } from '../prompts/diagnosis.prompt.js';
import { IMAGE_TRIAGE_SYSTEM_PROMPT } from '../prompts/triage.prompt.js';
import {
  diagnosisResponseSchema,
  type AdditionalImageRequest,
  type ImageAnalysisResponse,
  type DiagnosisResponse,
} from '../schemas/diagnosis.schema.js';
import {
  imageTriageJsonSchema,
  imageTriageSchema,
  type ImageTriage,
} from '../schemas/triage.schema.js';
import { createGeminiClient, mapGeminiError } from './gemini.service.js';
import { compressImage } from './image.service.js';

const MINIMUM_DIAGNOSIS_CONFIDENCE = 70;

const RECOVERABLE_DIAGNOSIS_ERROR_CODES = new Set([
  'EMPTY_MODEL_RESPONSE',
  'GEMINI_API_ERROR',
  'INVALID_MODEL_RESPONSE',
]);

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asText(value: unknown, fallback: string, maxLength: number): string {
  return typeof value === 'string' && value.trim()
    ? value.trim().slice(0, maxLength)
    : fallback;
}

function asTextList(value: unknown, maxItems: number): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === 'string' && Boolean(item.trim()))
    .map((item) => item.trim().slice(0, 500))
    .slice(0, maxItems);
}

function clamp(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(1, Math.max(0, value))
    : fallback;
}

function normalizeHighlight(value: unknown): DiagnosisResponse['highlight'] {
  const highlight = asRecord(value);
  const x = clamp(highlight?.x, 0.25);
  const y = clamp(highlight?.y, 0.25);
  const width = Math.min(Math.max(clamp(highlight?.width, 0.5), 0.01), 1 - x);
  const height = Math.min(Math.max(clamp(highlight?.height, 0.5), 0.01), 1 - y);

  return {
    x,
    y,
    width,
    height,
    label: asText(highlight?.label, 'Inspection area', 80),
  };
}

function parseDiagnosis(output: string): DiagnosisResponse {
  let json: unknown;

  try {
    json = JSON.parse(output);
  } catch {
    throw new HttpError(502, 'INVALID_MODEL_RESPONSE', 'The diagnosis service returned an invalid response.');
  }

  const source = asRecord(json);
  if (!source) {
    throw new HttpError(502, 'INVALID_MODEL_RESPONSE', 'The diagnosis service returned an invalid response.');
  }

  const causes = asTextList(source.causes, 6);
  const legacyCause = asText(source.cause, '', 500);
  if (causes.length === 0 && legacyCause) {
    causes.push(legacyCause);
  }

  const normalized: DiagnosisResponse = {
    device: asText(source.device, 'Unknown', 240),
    brand: asText(source.brand, 'Unknown', 240),
    model: asText(source.model, asText(source.device, 'Unknown', 240), 240),
    issue: asText(source.issue, 'Unknown', 240),
    confidence: source.confidence === 'high' ? 'high' : 'medium',
    causes,
    fix_steps: asTextList(source.fix_steps, 8),
    highlight: normalizeHighlight(source.highlight),
    safety_note: asText(
      source.safety_note,
      'Disconnect power before inspecting or repairing the device.',
      240,
    ),
  };

  const result = diagnosisResponseSchema.safeParse(normalized);
  if (!result.success) {
    throw new HttpError(502, 'INVALID_MODEL_RESPONSE', 'The diagnosis service returned an invalid response.');
  }

  return result.data;
}

function parseTriage(output: string): ImageTriage {
  let json: unknown;

  try {
    json = JSON.parse(output);
  } catch {
    throw new HttpError(502, 'INVALID_MODEL_RESPONSE', 'The image triage service returned an invalid response.');
  }

  const result = imageTriageSchema.safeParse(json);
  if (!result.success) {
    throw new HttpError(502, 'INVALID_MODEL_RESPONSE', 'The image triage service returned an invalid response.');
  }

  return result.data;
}

function createVisionInput(imageBase64: string, text: string) {
  return [
    {
      inlineData: {
        data: imageBase64,
        mimeType: 'image/jpeg',
      },
    },
    { text },
  ];
}

function createAdditionalImageRequest(triage: ImageTriage): AdditionalImageRequest {
  return {
    confidence: 'low',
    missing_information: triage.missing_information,
    suggested_photo: triage.suggested_photo,
  };
}

function createDiagnosisRetryRequest(): AdditionalImageRequest {
  return {
    confidence: 'low',
    missing_information:
      'The faulty component is not clear enough to produce a reliable diagnosis from this image.',
    suggested_photo:
      'Capture a well-lit close-up of the suspected fault, error indicator, damaged part, or the device model label.',
  };
}

function shouldRequestAnotherImage(error: unknown): boolean {
  return (
    error instanceof HttpError &&
    RECOVERABLE_DIAGNOSIS_ERROR_CODES.has(error.code)
  );
}

export async function diagnoseDevice(uploadedImage: Buffer): Promise<ImageAnalysisResponse> {
  const compressedImage = await compressImage(uploadedImage);
  const imageBase64 = compressedImage.toString('base64');

  try {
    const client = createGeminiClient();
    const triageResponse = await client.models.generateContent({
      model: env.geminiModel,
      contents: createVisionInput(
        imageBase64,
        'Check whether this image is sufficient for a reliable device diagnosis.',
      ),
      config: {
        responseJsonSchema: imageTriageJsonSchema,
        responseMimeType: 'application/json',
        systemInstruction: IMAGE_TRIAGE_SYSTEM_PROMPT,
        temperature: 0,
      },
    });

    if (!triageResponse.text) {
      throw new HttpError(502, 'EMPTY_MODEL_RESPONSE', 'The image triage service did not return a result.');
    }

    const triage = parseTriage(triageResponse.text);
    if (triage.confidence < MINIMUM_DIAGNOSIS_CONFIDENCE) {
      return createAdditionalImageRequest(triage);
    }

    try {
      const response = await client.models.generateContent({
        model: env.geminiModel,
        contents: createVisionInput(imageBase64, 'Inspect this device image and return the requested diagnosis JSON.'),
        config: {
          responseMimeType: 'application/json',
          systemInstruction: DEVICE_DIAGNOSIS_SYSTEM_PROMPT,
          temperature: 0,
        },
      });

      if (!response.text) {
        throw new HttpError(502, 'EMPTY_MODEL_RESPONSE', 'The diagnosis service did not return a result.');
      }

      return parseDiagnosis(response.text);
    } catch (error) {
      if (error instanceof HttpError) {
        if (shouldRequestAnotherImage(error)) {
          return createDiagnosisRetryRequest();
        }

        throw error;
      }

      try {
        return mapGeminiError(error);
      } catch (mappedError) {
        if (shouldRequestAnotherImage(mappedError)) {
          return createDiagnosisRetryRequest();
        }

        throw mappedError;
      }
    }
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }

    return mapGeminiError(error);
  }
}
