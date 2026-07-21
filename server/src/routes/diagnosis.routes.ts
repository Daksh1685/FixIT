import { Router } from 'express';

import { createDiagnosis } from '../controllers/diagnosis.controller.js';
import { createFollowUp } from '../controllers/follow-up.controller.js';
import { uploadImage } from '../middleware/upload.middleware.js';

export const diagnosisRouter = Router();

diagnosisRouter.post('/follow-up', createFollowUp);
diagnosisRouter.post('/', uploadImage.single('image'), createDiagnosis);
