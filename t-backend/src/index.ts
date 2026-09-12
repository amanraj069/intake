import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import passport from 'passport';

import { configurePassport } from './lib/passport';
import authRoutes from './routes/auth';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT || 9000;

// --- Middleware stack ---

app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());

// --- Passport configuration ---

configurePassport();

// --- Routes ---

app.get('/health', (_req, res) => {
  res.json({ success: true, message: 'Server is running' });
});

app.use('/auth', authRoutes);

// --- Error handling ---

app.use(errorHandler);

// --- Database connection + server start ---

async function start() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/t-starter';
    await mongoose.connect(mongoUri);
    console.log('[DB] Connected to MongoDB');

    app.listen(PORT, () => {
      console.log(`[Server] Running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('[DB] Connection failed:', error);
    process.exit(1);
  }
}

start();
