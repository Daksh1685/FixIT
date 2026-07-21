import { z } from 'zod';

const requestText = z.string().trim().min(1).max(240);

/** Vision-only clarity check performed before generating a repair diagnosis. */
export const imageTriageSchema = z
  .object({
    confidence: z.number().int().min(0).max(100),
    missing_information: requestText,
    suggested_photo: requestText,
  })
  .strict();

export type ImageTriage = z.infer<typeof imageTriageSchema>;

export const imageTriageJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['confidence', 'missing_information', 'suggested_photo'],
  properties: {
    confidence: { type: 'integer', minimum: 0, maximum: 100 },
    missing_information: { type: 'string' },
    suggested_photo: { type: 'string' },
  },
} as const;
