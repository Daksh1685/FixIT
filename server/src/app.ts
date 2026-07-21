import express from 'express';

import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';
import { diagnosisRouter } from './routes/diagnosis.routes.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));

  app.get('/', (_request, response) => {
    response.status(200).json({ service: 'SnapFix API', status: 'ok' });
  });

  app.get('/health', (_request, response) => {
    response.status(200).json({ status: 'ok' });
  });
  app.use('/api/diagnoses', diagnosisRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
