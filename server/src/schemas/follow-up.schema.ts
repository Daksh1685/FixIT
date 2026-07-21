import { z } from 'zod';

import { diagnosisResponseSchema } from './diagnosis.schema.js';

const messageContent = z.string().trim().min(1).max(1_200);

export const followUpMessageSchema = z
  .object({
    role: z.enum(['user', 'assistant']),
    content: messageContent,
  })
  .strict();

export const followUpRequestSchema = z
  .object({
    diagnosis: diagnosisResponseSchema,
    messages: z.array(followUpMessageSchema).max(16),
    question: messageContent,
  })
  .strict();

export const followUpResponseSchema = z
  .object({
    answer: z.string().trim().min(1).max(1_600),
  })
  .strict();

export type FollowUpRequest = z.infer<typeof followUpRequestSchema>;
export type FollowUpResponse = z.infer<typeof followUpResponseSchema>;

export const followUpJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['answer'],
  properties: {
    answer: { type: 'string' },
  },
} as const;
