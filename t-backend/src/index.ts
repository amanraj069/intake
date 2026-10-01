import 'dotenv/config';

import { Server } from 'node:http';
import mongoose from 'mongoose';

import { createApp } from './app';
import { connectRedis, disconnectRedis } from './lib/redis';

const PORT = process.env.PORT || 9000;
const SHUTDOWN_TIMEOUT_MS = 10_000;

/**
 * Lets in-flight requests finish and closes Mongo and Redis cleanly, so a
 * deploy does not cut off a rate-limit write or a session revocation midway.
 */
function closeConnectionsOnShutdown(server: Server): void {
  const shutdown = (signal: string) => {
    console.log(`[Server] ${signal} received, shutting down`);
    // Long-lived chat streams would otherwise hold the close open indefinitely.
    setTimeout(() => process.exit(1), SHUTDOWN_TIMEOUT_MS).unref();
    server.close(async () => {
      try {
        await Promise.all([mongoose.disconnect(), disconnectRedis()]);
        process.exit(0);
      } catch (error) {
        console.error('[Server] Error while closing connections:', error);
        process.exit(1);
      }
    });
  };
  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));
}

async function start() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/t-starter';
    await mongoose.connect(mongoUri);
    console.log('[DB] Connected to MongoDB');

    await connectRedis();

    const server = createApp().listen(PORT, () => {
      console.log(`[Server] Running on http://localhost:${PORT}`);
    });
    closeConnectionsOnShutdown(server);
  } catch (error) {
    console.error('[Startup] Connection failed:', error);
    process.exit(1);
  }
}

start();
