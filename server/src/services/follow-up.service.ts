import { env } from '../config/env.js';
import { HttpError } from '../errors/http-error.js';
import { FOLLOW_UP_SYSTEM_PROMPT } from '../prompts/follow-up.prompt.js';
import {
  followUpJsonSchema,
  followUpResponseSchema,
  type FollowUpRequest,
  type FollowUpResponse,
} from '../schemas/follow-up.schema.js';
import { createGeminiClient, mapGeminiError } from './gemini.service.js';

function createFollowUpInput(request: FollowUpRequest): string {
  return [
    'Original diagnosis JSON:',
    JSON.stringify(request.diagnosis),
    'Previous session messages JSON:',
    JSON.stringify(request.messages),
    'New user question:',
    request.question,
  ].join('\n\n');
}

function parseFollowUp(output: string): FollowUpResponse {
  let json: unknown;

  try {
    json = JSON.parse(output);
  } catch {
    throw new HttpError(502, 'INVALID_MODEL_RESPONSE', 'The follow-up service returned an invalid response.');
  }

  const result = followUpResponseSchema.safeParse(json);
  if (!result.success) {
    throw new HttpError(502, 'INVALID_MODEL_RESPONSE', 'The follow-up service returned an invalid response.');
  }

  return result.data;
}

export async function answerFollowUp(request: FollowUpRequest): Promise<FollowUpResponse> {
  try {
    const response = await createGeminiClient().models.generateContent({
      model: env.geminiModel,
      contents: createFollowUpInput(request),
      config: {
        responseJsonSchema: followUpJsonSchema,
        responseMimeType: 'application/json',
        systemInstruction: FOLLOW_UP_SYSTEM_PROMPT,
        temperature: 0.2,
      },
    });

    if (!response.text) {
      throw new HttpError(502, 'EMPTY_MODEL_RESPONSE', 'The follow-up service did not return a result.');
    }

    return parseFollowUp(response.text);
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }

    return mapGeminiError(error);
  }
}
