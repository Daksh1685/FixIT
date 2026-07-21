import { z } from 'zod';

const shortText = z.string().trim().min(1).max(240);
const listItem = z.string().trim().min(1).max(500);
const normalizedCoordinate = z.number().finite().min(0).max(1);

/** A normalized, top-left anchored rectangle over the original source image. */
export const diagnosisHighlightSchema = z
  .object({
    x: normalizedCoordinate,
    y: normalizedCoordinate,
    width: normalizedCoordinate.refine((value) => value > 0, 'width must be greater than zero'),
    height: normalizedCoordinate.refine((value) => value > 0, 'height must be greater than zero'),
    label: z.string().trim().min(1).max(80),
  })
  .strict()
  .superRefine((highlight, context) => {
    if (highlight.x + highlight.width > 1) {
      context.addIssue({ code: 'custom', message: 'highlight must fit within the image width' });
    }

    if (highlight.y + highlight.height > 1) {
      context.addIssue({ code: 'custom', message: 'highlight must fit within the image height' });
    }
  });

/** The application contract returned to the SnapFix client. */
export const diagnosisResponseSchema = z
  .object({
    device: shortText,
    brand: shortText,
    model: shortText,
    issue: shortText,
    confidence: z.enum(['medium', 'high']),
    causes: z.array(listItem).max(6),
    fix_steps: z.array(listItem).max(8),
    highlight: diagnosisHighlightSchema,
    safety_note: shortText,
  })
  .strict();

export type DiagnosisResponse = z.infer<typeof diagnosisResponseSchema>;

/** Returned instead of a diagnosis when the image cannot support a 70% confidence assessment. */
export const additionalImageRequestSchema = z
  .object({
    confidence: z.literal('low'),
    missing_information: shortText,
    suggested_photo: shortText,
  })
  .strict();

export type AdditionalImageRequest = z.infer<typeof additionalImageRequestSchema>;
export type ImageAnalysisResponse = DiagnosisResponse | AdditionalImageRequest;

/**
 * Sent to Gemini Structured Outputs. Keep this in sync with the runtime Zod
 * validator above: the validator is the final trust boundary.
 */
export const diagnosisJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'device',
    'brand',
    'model',
    'issue',
    'confidence',
    'causes',
    'fix_steps',
    'highlight',
    'safety_note',
  ],
  properties: {
    device: { type: 'string' },
    brand: { type: 'string' },
    model: { type: 'string' },
    issue: { type: 'string' },
    confidence: { type: 'string', enum: ['medium', 'high'] },
    causes: {
      type: 'array',
      maxItems: 6,
      items: { type: 'string' },
    },
    fix_steps: {
      type: 'array',
      maxItems: 8,
      items: { type: 'string' },
    },
    highlight: {
      type: 'object',
      additionalProperties: false,
      required: ['x', 'y', 'width', 'height', 'label'],
      properties: {
        x: { type: 'number', minimum: 0, maximum: 1 },
        y: { type: 'number', minimum: 0, maximum: 1 },
        width: { type: 'number', minimum: 0, maximum: 1 },
        height: { type: 'number', minimum: 0, maximum: 1 },
        label: { type: 'string' },
      },
    },
    safety_note: { type: 'string' },
  },
} as const;
