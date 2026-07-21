import { env } from '../config/env.js';
import { HttpError } from '../errors/http-error.js';
import { DEVICE_DIAGNOSIS_SYSTEM_PROMPT } from '../prompts/diagnosis.prompt.js';
import {
  diagnosisJsonSchema,
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
  const values = Array.isArray(value) ? value : typeof value === 'string' ? [value] : [];

  return values
    .filter((item): item is string => typeof item === 'string' && Boolean(item.trim()))
    .map((item) => item.trim().slice(0, 500))
    .slice(0, maxItems);
}

function asNormalizedCoordinate(value: unknown, fallback: number): number {
  const numericValue =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number.parseFloat(value.replace('%', ''))
        : Number.NaN;

  if (!Number.isFinite(numericValue)) {
    return fallback;
  }

  const normalizedValue = numericValue > 1 ? numericValue / 100 : numericValue;
  return Math.min(1, Math.max(0, normalizedValue));
}

function parseJsonObject(output: string): unknown {
  const trimmed = output.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');

  try {
    return JSON.parse(trimmed);
  } catch {
    const firstBrace = trimmed.indexOf('{');
    const lastBrace = trimmed.lastIndexOf('}');

    if (firstBrace === -1 || lastBrace <= firstBrace) {
      throw new HttpError(502, 'INVALID_MODEL_RESPONSE', 'The diagnosis service returned an invalid response.');
    }

    try {
      return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
    } catch {
      throw new HttpError(502, 'INVALID_MODEL_RESPONSE', 'The diagnosis service returned an invalid response.');
    }
  }
}

function normalizeHighlight(value: unknown): DiagnosisResponse['highlight'] {
  const highlight = asRecord(value);
  const x = Math.min(asNormalizedCoordinate(highlight?.x, 0.25), 0.98);
  const y = Math.min(asNormalizedCoordinate(highlight?.y, 0.25), 0.98);
  const width = Math.min(
    Math.max(asNormalizedCoordinate(highlight?.width, 0.5), 0.01),
    1 - x,
  );
  const height = Math.min(
    Math.max(asNormalizedCoordinate(highlight?.height, 0.5), 0.01),
    1 - y,
  );

  return {
    x,
    y,
    width,
    height,
    label: asText(highlight?.label, 'Inspection area', 80),
  };
}

function parseDiagnosis(output: string): DiagnosisResponse {
  const source = asRecord(parseJsonObject(output));
  if (!source) {
    throw new HttpError(502, 'INVALID_MODEL_RESPONSE', 'The diagnosis service returned an invalid response.');
  }

  const causes = asTextList(source.causes, 6);
  const legacyCause = asText(source.cause, '', 500);
  if (causes.length === 0 && legacyCause) {
    causes.push(legacyCause);
  }

  const finding = source.finding === 'issue_found' ? 'issue_found' : 'no_issue_visible';
  const hasVisibleIssue = finding === 'issue_found';

  const normalized: DiagnosisResponse = {
    device: asText(source.device, 'Unknown', 240),
    brand: asText(source.brand, 'Unknown', 240),
    model: asText(source.model, asText(source.device, 'Unknown', 240), 240),
    finding,
    issue: hasVisibleIssue
      ? asText(source.issue, 'Unknown', 240)
      : 'No visible fault detected',
    confidence: source.confidence === 'high' ? 'high' : 'medium',
    causes: hasVisibleIssue ? causes : [],
    fix_steps: hasVisibleIssue ? asTextList(source.fix_steps, 8) : [],
    highlight: normalizeHighlight(source.highlight),
    safety_note: asText(
      source.safety_note,
      hasVisibleIssue
        ? 'Disconnect power before inspecting or repairing the device.'
        : 'No repair action is recommended based on this photo.',
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
        responseJsonSchema: diagnosisJsonSchema,
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
