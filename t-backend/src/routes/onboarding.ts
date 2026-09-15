import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { aiRequestsRateLimit } from '../middleware/rateLimit';
import { validate } from '../middleware/validate';
import { completeOnboardingSchema, generatePlanSchema } from '../schemas/onboarding.schema';
import * as onboardingController from '../controllers/onboarding.controller';

const router = Router();

router.use(requireAuth);

router.post(
  '/plan',
  aiRequestsRateLimit,
  validate(generatePlanSchema),
  onboardingController.generatePlan
);
router.post(
  '/complete',
  validate(completeOnboardingSchema),
  onboardingController.completeOnboarding
);

export default router;
