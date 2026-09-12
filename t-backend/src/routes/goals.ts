import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { upsertGoalSchema } from '../schemas/goal.schema';
import * as goalController from '../controllers/goal.controller';

const router = Router();

router.use(requireAuth);

router.get('/', goalController.getGoal);
router.post('/', validate(upsertGoalSchema), goalController.upsertGoal);

export default router;
