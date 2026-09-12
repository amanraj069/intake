import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  createFoodEntrySchema,
  foodEntryIdSchema,
  updateFoodEntrySchema,
} from '../schemas/foodEntry.schema';
import * as foodEntryController from '../controllers/foodEntry.controller';

const router = Router();

router.use(requireAuth);

router.post('/', validate(createFoodEntrySchema), foodEntryController.createFoodEntry);
router.patch('/:id', validate(updateFoodEntrySchema), foodEntryController.updateFoodEntry);
router.delete('/:id', validate(foodEntryIdSchema), foodEntryController.deleteFoodEntry);

export default router;
