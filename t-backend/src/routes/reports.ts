import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  weeklyCaloriesSchema,
  macrosSchema,
  microsSchema,
  goalComparisonSchema,
} from '../schemas/report.schema';
import {
  getWeeklyCalories,
  getMacroBreakdown,
  getMicroSummary,
  getGoalComparison,
} from '../controllers/report.controller';

const router = Router();

router.use(requireAuth);

router.get('/weekly-calories', validate(weeklyCaloriesSchema), getWeeklyCalories);
router.get('/macros', validate(macrosSchema), getMacroBreakdown);
router.get('/micros', validate(microsSchema), getMicroSummary);
router.get('/goal-comparison', validate(goalComparisonSchema), getGoalComparison);

export default router;
