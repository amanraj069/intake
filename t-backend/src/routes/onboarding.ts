import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { completeOnboardingSchema, generatePlanSchema } from '../schemas/onboarding.schema';
import * as onboardingController from '../controllers/onboarding.controller';

const router = Router();

router.use(requireAuth);

router.post('/plan', validate(generatePlanSchema), onboardingController.generatePlan);
router.post('/complete', validate(completeOnboardingSchema), onboardingController.completeOnboarding);

export default router;
