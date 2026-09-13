import './testEnv';

import { randomUUID } from 'node:crypto';
import { AddressInfo } from 'node:net';
import { Server } from 'node:http';
import mongoose from 'mongoose';

import { createApp } from '../../src/app';
import { generateAccessToken } from '../../src/lib/jwt';
import { FoodEntry } from '../../src/models/FoodEntry';
import { Goal } from '../../src/models/Goal';
import { User } from '../../src/models/User';

const DEFAULT_MONGODB_URI = 'mongodb://localhost:27017/t-starter';

export interface TestUser {
  id: string;
  email: string;
  accessToken: string;
}

export interface ApiResult {
  status: number;
  // Response bodies differ per endpoint; each test asserts on the fields it needs.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any;
}

export interface TestServer {
  request(user: TestUser | null, method: string, path: string, body?: unknown): Promise<ApiResult>;
  close(): Promise<void>;
}

/**
 * Connects to a uniquely named database on the configured Mongo server, so the
 * suite never reads or writes the development data, and drops it on close.
 */
async function connectToThrowawayDatabase(): Promise<void> {
  // Test files run in parallel processes, so the timestamp alone could collide.
  const dbName = `intake-test-${Date.now()}-${randomUUID().slice(0, 8)}`;
  await mongoose.connect(process.env.MONGODB_URI || DEFAULT_MONGODB_URI, { dbName });
  await Promise.all([User.init(), Goal.init(), FoodEntry.init()]);
}

function listen(): Promise<Server> {
  return new Promise((resolve) => {
    const server = createApp().listen(0, () => resolve(server));
  });
}

export async function startTestServer(): Promise<TestServer> {
  await connectToThrowawayDatabase();
  const server = await listen();
  const { port } = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${port}`;

  async function request(
    user: TestUser | null,
    method: string,
    path: string,
    body?: unknown
  ): Promise<ApiResult> {
    const isMultipart = body instanceof FormData;
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        // FormData needs the boundary fetch generates, so its Content-Type is never set by hand.
        ...(isMultipart ? {} : { 'Content-Type': 'application/json' }),
        ...(user ? { Cookie: `access_token=${user.accessToken}` } : {}),
      },
      body: body === undefined || isMultipart ? body : JSON.stringify(body),
    });
    return { status: response.status, body: await response.json() };
  }

  async function close(): Promise<void> {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }

  return { request, close };
}

/**
 * Inserts a verified local account directly and mints its access token, which
 * skips the email OTP signup flow: that flow is covered by auth, not isolation.
 */
export async function createTestUser(label: string): Promise<TestUser> {
  const email = `${label}-${Date.now()}@isolation.test`;
  const user = await User.create({
    email,
    password: 'not-a-real-hash',
    emailVerified: true,
    authProvider: 'local',
  });
  const id = user._id.toString();
  return { id, email, accessToken: generateAccessToken({ userId: id, email }) };
}
