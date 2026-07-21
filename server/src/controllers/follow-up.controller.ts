import type { RequestHandler } from 'express';

import { HttpError } from '../errors/http-error.js';
import { followUpRequestSchema } from '../schemas/follow-up.schema.js';
import { answerFollowUp } from '../services/follow-up.service.js';

export const createFollowUp: RequestHandler = async (request, response) => {
  const parsedRequest = followUpRequestSchema.safeParse(request.body);
  if (!parsedRequest.success) {
    throw new HttpError(
      400,
      'INVALID_FOLLOW_UP_REQUEST',
      'Send a diagnosis, previous messages, and a question.',
    );
  }

  const followUp = await answerFollowUp(parsedRequest.data);
  response.status(200).json(followUp);
};
