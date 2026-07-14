import { describe, it, expect, beforeAll } from 'vitest';
import { getPayload } from 'payload';
import type { Payload, SanitizedConfig } from 'payload';
import { buildConfig } from 'payload';
import { sqliteAdapter } from '@payloadcms/db-sqlite';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import { createTesterAxios } from '../src/index.js';
import { EndpointNotFoundError } from '../src/errors.js';

describe('createTesterAxios', () => {
  let payload: Payload;
  let config: SanitizedConfig;
  let lastBeforeChangeTxId: unknown = null;

  beforeAll(async () => {
    // Build standard Payload config with in-memory SQLite
    config = await buildConfig({
      db: sqliteAdapter({
        client: {
          url: 'file::memory:',
        },
      }),
      editor: lexicalEditor({}),
      secret: 'SECRET_FOR_TESTING_PURPOSES_ONLY_1234567890',
      routes: {
        api: '/api',
      },
      collections: [
        {
          slug: 'users',
          auth: true,
          access: {
            create: () => true,
            read: () => true,
          },
          hooks: {
            beforeChange: [
              ({ req }) => {
                lastBeforeChangeTxId =
                  (req as any).transactionID ?? (req as any).transactionId ?? null;
              },
            ],
          },
          fields: [
            {
              name: 'email',
              type: 'email',
              required: true,
            },
          ],
          endpoints: [
            {
              path: '/custom/:id',
              method: 'get',
              handler: async (req) => {
                const id = req.routeParams?.id;
                const transactionID =
                  (req as any).transactionID ?? (req as any).transactionId ?? null;
                return Response.json({
                  success: true,
                  id,
                  userEmail: req.user ? req.user.email : null,
                  transactionID,
                });
              },
            },
            {
              path: '/submit',
              method: 'post',
              handler: async (req) => {
                const body = (req.json ? await req.json() : {}) as Record<string, unknown>;
                return Response.json({ received: body });
              },
            },
          ],
        },
      ],
      endpoints: [
        {
          path: '/global-test',
          method: 'get',
          handler: async () => {
            return Response.json({ global: true });
          },
        },
      ],
    });

    payload = await getPayload({ config });
  });

  it('should match and call global config endpoints', async () => {
    const client = createTesterAxios(config);
    const res = await client.get('/api/global-test');
    expect(res.status).toBe(200);
    expect(res.data).toEqual({ global: true });
  });

  it('should match and call collection endpoints with route parameter extraction', async () => {
    const client = createTesterAxios(config);
    const res = await client.get('/api/users/custom/abc-123');
    expect(res.status).toBe(200);
    expect(res.data).toEqual({
      success: true,
      id: 'abc-123',
      userEmail: null,
      transactionID: null,
    });
  });

  it('should handle POST requests with body payload', async () => {
    const client = createTesterAxios(config);
    const res = await client.post('/api/users/submit', { foo: 'bar' });
    expect(res.status).toBe(200);
    expect(res.data).toEqual({
      received: { foo: 'bar' },
    });
  });

  it('should support requestPatcher to mutate requests', async () => {
    const client = createTesterAxios(config, {
      requestPatcher: (req) => {
        req.routeParams = { id: 'patched-id' };
        return req;
      },
    });
    const res = await client.get('/api/users/custom/999');
    expect(res.status).toBe(200);
    expect(res.data).toEqual({
      success: true,
      id: 'patched-id',
      userEmail: null,
      transactionID: null,
    });
  });

  it('should throw EndpointNotFoundError when no matching route is found', async () => {
    const client = createTesterAxios(config);
    await expect(client.get('/api/non-existent-route')).rejects.toThrow(EndpointNotFoundError);
  });

  it('should resolve user session when auth token is present', async () => {
    // 1. Create a user first in db
    const email = 'test-auth-user@example.com';
    const password = 'Password123!';
    await payload.create({
      collection: 'users',
      data: {
        email,
        password,
      },
    });

    const client = createTesterAxios(config);

    // 2. Perform a login using Payload's standard login endpoint/method to get a token
    const loginRes = await client.post('/api/users/login', {
      email,
      password,
    });
    expect(loginRes.status).toBe(200);
    expect(loginRes.data.token).toBeDefined();
    const token = loginRes.data.token as string;

    // 3. Make call passing authorization headers and assert req.user is resolved
    const res = await client.get(`/api/users/custom/user-profile`, {
      headers: {
        Authorization: `JWT ${token}`,
      },
    });
    expect(res.status).toBe(200);
    expect(res.data).toEqual({
      success: true,
      id: 'user-profile',
      userEmail: email,
      transactionID: null,
    });
  });

  it('should support default config options and dynamic runtime header updates', async () => {
    const email = 'test-defaults@example.com';
    const password = 'Password123!';
    await payload.create({
      collection: 'users',
      data: {
        email,
        password,
      },
    });

    // Create client with custom base axiosConfig
    const client = createTesterAxios(config, {
      axiosConfig: {
        timeout: 5000,
      },
    });

    // Perform login
    const loginRes = await client.post('/api/users/login', {
      email,
      password,
    });
    const token = loginRes.data.token as string;

    // Inject token to defaults dynamically
    client.defaults.headers.common['Authorization'] = `JWT ${token}`;

    const res = await client.get('/api/users/custom/user-profile');
    expect(res.status).toBe(200);
    expect(res.data).toEqual({
      success: true,
      id: 'user-profile',
      userEmail: email,
      transactionID: null,
    });
  });

  it('should support built-in CRUD endpoints and propagate database transaction context', async () => {
    lastBeforeChangeTxId = null;

    const client = createTesterAxios(config);

    // Call built-in CRUD endpoint (POST /api/users) to create a user
    const res = await client.post('/api/users', {
      email: 'builtin-crud-test@example.com',
      password: 'Password123!',
    });

    expect(res.status).toBe(201);
    expect(res.data.doc.email).toBe('builtin-crud-test@example.com');

    // Confirm that standard Payload operation begins a database transaction and propagates it
    expect(lastBeforeChangeTxId).not.toBeNull();
    expect(lastBeforeChangeTxId).toBeDefined();
  });
});
