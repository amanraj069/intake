import 'dotenv/config';

import mongoose from 'mongoose';

import { createApp } from './app';

const PORT = process.env.PORT || 9000;

async function start() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/t-starter';
    await mongoose.connect(mongoUri);
    console.log('[DB] Connected to MongoDB');

    createApp().listen(PORT, () => {
      console.log(`[Server] Running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('[DB] Connection failed:', error);
    process.exit(1);
  }
}

start();
