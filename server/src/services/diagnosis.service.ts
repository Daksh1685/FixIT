import { env } from '../config/env.js';
import { HttpError } from '../errors/http-error.js';
import { DEVICE_DIAGNOSIS_SYSTEM_PROMPT } from '../prompts/diagnosis.prompt.js';
import {
  diagnosisResponseSchema,
  type DiagnosisResponse,
} from '../schemas/diagnosis.schema.js';
import { createGeminiClient, mapGeminiError } from './gemini.service.js';
import { compressImage } from './image.service.js';

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

export async function diagnoseDevice(uploadedImage: Buffer): Promise<DiagnosisResponse> {
  const compressedImage = await compressImage(uploadedImage);
  const imageBase64 = compressedImage.toString('base64');

  try {
    const client = createGeminiClient();
    const response = await client.models.generateContent({
      model: env.geminiModel,
      contents: createVisionInput(
        imageBase64,
        'Inspect this device image and return the requested diagnosis JSON.',
      ),
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
      throw error;
    }

    return mapGeminiError(error);
  }
}
