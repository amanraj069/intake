import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  getSharedMealSchema,
  listSharedMealsSchema,
  markSharesSeenSchema,
  revokeMealAccessSchema,
  shareMealSchema,
} from '../schemas/sharedMeal.schema';
import * as sharedMealController from '../controllers/sharedMeal.controller';

const router = Router();

router.use(requireAuth);

router.get('/', validate(listSharedMealsSchema), sharedMealController.listSharedMeals);
router.get('/sent', validate(listSharedMealsSchema), sharedMealController.listSentMeals);
router.get('/unseen-count', sharedMealController.getUnseenShareCount);
router.get('/received/:shareId', validate(getSharedMealSchema), sharedMealController.getSharedMeal);
router.post('/', validate(shareMealSchema), sharedMealController.shareMeal);
router.patch('/seen', validate(markSharesSeenSchema), sharedMealController.markSharesSeen);
router.patch('/:mealId/access', validate(revokeMealAccessSchema), sharedMealController.revokeMealAccess);

export default router;
