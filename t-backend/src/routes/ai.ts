import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { uploadFoodImageFile } from '../middleware/upload';
import { validate } from '../middleware/validate';
import { extractNutritionSchema } from '../schemas/aiExtraction.schema';
import * as aiExtractionController from '../controllers/aiExtraction.controller';

const router = Router();

router.use(requireAuth);

// The upload runs before validation: multipart text fields only exist on
// `req.body` once multer has parsed the form.
router.post(
  '/extract-nutrition',
  uploadFoodImageFile,
  validate(extractNutritionSchema),
  aiExtractionController.extractNutrition
);

export default router;
