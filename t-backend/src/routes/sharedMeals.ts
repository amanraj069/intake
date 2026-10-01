import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { listSharedMealsSchema, shareMealSchema } from '../schemas/sharedMeal.schema';
import * as sharedMealController from '../controllers/sharedMeal.controller';

const router = Router();

router.use(requireAuth);

router.get('/', validate(listSharedMealsSchema), sharedMealController.listSharedMeals);
router.post('/', validate(shareMealSchema), sharedMealController.shareMeal);

export default router;
