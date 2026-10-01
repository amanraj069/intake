import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import passport from 'passport';

import { configurePassport } from './lib/passport';
import authRoutes from './routes/auth';
import goalRoutes from './routes/goals';
import foodEntryRoutes from './routes/foodEntries';
import reportRoutes from './routes/reports';
import onboardingRoutes from './routes/onboarding';
import aiRoutes from './routes/ai';
import chatRoutes from './routes/chat';
import sharedMealRoutes from './routes/sharedMeals';
import { errorHandler } from './middleware/errorHandler';
import { generalRateLimit } from './middleware/rateLimit';
import { trustedProxyHops } from './lib/trustProxy';
import { redisStatus } from './lib/redis';

/**
 * Builds the fully wired Express app without connecting to the database or
 * listening on a port, so tests can mount it against their own database.
 */
export function createApp(): Express {
  const app = express();

  app.set('trust proxy', trustedProxyHops());
  app.use(helmet());
  app.use(
    cors({
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true,
      // Lets the client tell a replayed response from a fresh one; request headers are reflected by default.
      exposedHeaders: ['Idempotent-Replayed'],
    })
  );
  app.use(express.json());
  app.use(cookieParser());
  app.use(passport.initialize());

  configurePassport();

  // Registered before the limiter so uptime monitors are never throttled.
  app.get('/health', (_req, res) => {
    res.json({ success: true, message: 'Server is running', data: { redis: redisStatus() } });
  });

  app.use(generalRateLimit);

  app.use('/auth', authRoutes);
  app.use('/api/goals', goalRoutes);
  app.use('/api/food-entries', foodEntryRoutes);
  app.use('/api/reports', reportRoutes);
  app.use('/api/onboarding', onboardingRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/chat', chatRoutes);
  app.use('/api/shared-meals', sharedMealRoutes);

  app.use(errorHandler);

  return app;
}
