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
      throw error;
    }

    return mapGeminiError(error);
  }
}
