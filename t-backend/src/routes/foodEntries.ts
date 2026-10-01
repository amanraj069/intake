import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { idempotent } from '../middleware/idempotency';
import { aiRequestsRateLimit } from '../middleware/rateLimit';
import { validate } from '../middleware/validate';
import {
  createFoodEntrySchema,
  foodEntryIdSchema,
  foodEntrySeriesSchema,
  foodEntrySummarySchema,
  listFoodEntriesSchema,
  updateFoodEntrySchema,
} from '../schemas/foodEntry.schema';
import { uploadFoodDiaryPdf, uploadFoodImageFile } from '../middleware/upload';
import { confirmFoodEntryImportSchema, foodDiaryImportJobSchema } from '../schemas/foodEntryImport.schema';
import * as foodEntryController from '../controllers/foodEntry.controller';
import * as foodEntryImportController from '../controllers/foodEntryImport.controller';
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler';

function parseMultipartMealData(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body.data === 'string') {
    try {
      req.body = JSON.parse(req.body.data);
    } catch {
      return next(new AppError('Invalid JSON data in form', 400, 'INVALID_FORM_DATA'));
    }
  }
  next();
}

const router = Router();

router.use(requireAuth);

router.get('/', validate(listFoodEntriesSchema), foodEntryController.listFoodEntries);
// Registered before `/:id` so the literal path is not swallowed by the id route.
router.get('/summary', validate(foodEntrySummarySchema), foodEntryController.getDailyIntakeSummary);
router.get('/series', validate(foodEntrySeriesSchema), foodEntryController.getDailyIntakeSeries);
router.get('/:id', validate(foodEntryIdSchema), foodEntryController.getFoodEntry);

router.post('/upload-image', uploadFoodImageFile, foodEntryController.uploadMealImage);

router.post(
  '/',
  uploadFoodImageFile,
  parseMultipartMealData,
  validate(createFoodEntrySchema),
  idempotent('create-food-entry'),
  foodEntryController.createFoodEntry
);
// The upload runs before any handler: the PDF only exists on `req.file` once multer has parsed the form.
router.post(
  '/import/preview',
  aiRequestsRateLimit,
  uploadFoodDiaryPdf,
  foodEntryImportController.previewFoodEntryImport
);
// Polled every couple of seconds while an import runs, so it sits outside the AI rate limit.
router.get(
  '/import/jobs/:jobId',
  validate(foodDiaryImportJobSchema),
  foodEntryImportController.getFoodEntryImportJob
);
router.post(
  '/import/confirm',
  validate(confirmFoodEntryImportSchema),
  idempotent('confirm-food-import'),
  foodEntryImportController.confirmFoodEntryImport
);
router.patch('/:id', validate(updateFoodEntrySchema), foodEntryController.updateFoodEntry);
router.delete('/:id', validate(foodEntryIdSchema), foodEntryController.deleteFoodEntry);

export default router;
