import { env } from '../config/env.js';
import { HttpError } from '../errors/http-error.js';
import { DEVICE_DIAGNOSIS_SYSTEM_PROMPT } from '../prompts/diagnosis.prompt.js';
import { IMAGE_TRIAGE_SYSTEM_PROMPT } from '../prompts/triage.prompt.js';
import {
  diagnosisJsonSchema,
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

function parseDiagnosis(output: string): DiagnosisResponse {
  let json: unknown;

  try {
    json = JSON.parse(output);
  } catch {
    throw new HttpError(502, 'INVALID_MODEL_RESPONSE', 'The diagnosis service returned an invalid response.');
  }

  const result = diagnosisResponseSchema.safeParse(json);
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
