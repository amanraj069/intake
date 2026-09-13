import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  createFoodEntrySchema,
  foodEntryIdSchema,
  foodEntrySeriesSchema,
  foodEntrySummarySchema,
  listFoodEntriesSchema,
  updateFoodEntrySchema,
} from '../schemas/foodEntry.schema';
import { uploadFoodDiaryPdf } from '../middleware/upload';
import { confirmFoodEntryImportSchema } from '../schemas/foodEntryImport.schema';
import * as foodEntryController from '../controllers/foodEntry.controller';
import * as foodEntryImportController from '../controllers/foodEntryImport.controller';

const router = Router();

router.use(requireAuth);

router.get('/', validate(listFoodEntriesSchema), foodEntryController.listFoodEntries);
// Registered before `/:id` so the literal path is not swallowed by the id route.
router.get(
  '/summary',
  validate(foodEntrySummarySchema),
  foodEntryController.getDailyIntakeSummary
);
router.get('/series', validate(foodEntrySeriesSchema), foodEntryController.getDailyIntakeSeries);
router.get('/:id', validate(foodEntryIdSchema), foodEntryController.getFoodEntry);

router.post('/', validate(createFoodEntrySchema), foodEntryController.createFoodEntry);
// The upload runs before any handler: the PDF only exists on `req.file` once multer has parsed the form.
router.post(
  '/import/preview',
  uploadFoodDiaryPdf,
  foodEntryImportController.previewFoodEntryImport
);
router.post(
  '/import/confirm',
  validate(confirmFoodEntryImportSchema),
  foodEntryImportController.confirmFoodEntryImport
);
router.patch('/:id', validate(updateFoodEntrySchema), foodEntryController.updateFoodEntry);
router.delete('/:id', validate(foodEntryIdSchema), foodEntryController.deleteFoodEntry);

export default router;
