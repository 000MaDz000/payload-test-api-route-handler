<div align="center">

# payload-test-api-route-handler

**Test Payload CMS API routes without a running server.**

[![npm version](https://img.shields.io/npm/v/payload-test-api-route-handler.svg?style=flat-square&color=cb3837)](https://www.npmjs.com/package/payload-test-api-route-handler)
[![npm downloads](https://img.shields.io/npm/dm/payload-test-api-route-handler.svg?style=flat-square&color=blue)](https://www.npmjs.com/package/payload-test-api-route-handler)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg?style=flat-square)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-3178c6.svg?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Payload CMS](https://img.shields.io/badge/Payload_CMS-v3-000000.svg?style=flat-square)](https://payloadcms.com/)

An in-process test utility for [Payload CMS](https://payloadcms.com) v3+ that lets you exercise API route handlers, authentication, database transactions, and custom endpoints using a standard [Axios](https://axios-http.com) client — **without starting a live HTTP server**.

</div>

---

## Why?

Testing Payload CMS endpoints typically requires spinning up a full Next.js dev server. This is **slow**, **flaky**, and makes CI pipelines painful.

This package gives you a drop-in Axios client that routes requests **directly** into Payload's handler pipeline in-process. Your tests run in milliseconds, not seconds.

```
Traditional approach          This package
┌──────────┐                  ┌──────────┐
│  Test     │ ── HTTP ──►     │  Test     │
│  Suite    │                 │  Suite    │
└──────────┘                  └─────┬────┘
     │                              │
     ▼                              ▼  (in-process)
┌──────────┐                  ┌──────────┐
│  HTTP    │                  │  Payload │
│  Server  │                  │  Handler │
└─────┬────┘                  └──────────┘
      │                       No network. No server.
      ▼                       Just fast tests.
┌──────────┐
│  Payload │
│  Handler │
└──────────┘
```

## Features

- 🚀 **Zero Server** — No HTTP server, no port conflicts, no startup delay
- 🔐 **Full Auth Pipeline** — JWT login, token resolution, `req.user` — it all works
- 🗄️ **Real Transactions** — Database transaction context flows through hooks exactly like production
- 🧬 **Request Patching** — Inject custom user sessions, override route params, mock anything
- 📦 **Standard Axios** — Interceptors, defaults, `client.defaults.headers` — everything you expect
- 🧪 **Framework Agnostic** — Works with Vitest, Jest, or any test runner
- 🎯 **Full Endpoint Coverage** — Config endpoints, collection endpoints, global endpoints, and built-in CRUD

## Installation

```bash
# npm
npm install --save-dev payload-test-api-route-handler

# yarn
yarn add -D payload-test-api-route-handler

# pnpm
pnpm add -D payload-test-api-route-handler
```

> **Peer dependency:** Requires `payload` v3.85.1 or later.

## Quick Start

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { getPayload } from 'payload';
import { buildConfig } from 'payload';
import { sqliteAdapter } from '@payloadcms/db-sqlite';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import { createTesterAxios } from 'payload-test-api-route-handler';

describe('My API', () => {
  let config;

  beforeAll(async () => {
    config = await buildConfig({
      db: sqliteAdapter({ client: { url: 'file::memory:' } }),
      editor: lexicalEditor({}),
      secret: 'test-secret-at-least-32-chars-long!!',
      collections: [
        {
          slug: 'posts',
          fields: [{ name: 'title', type: 'text', required: true }],
          endpoints: [
            {
              path: '/featured',
              method: 'get',
              handler: async () =>
                Response.json({ featured: true }),
            },
          ],
        },
      ],
    });

    await getPayload({ config });
  });

  it('hits a custom endpoint', async () => {
    const client = createTesterAxios(config);
    const res = await client.get('/api/posts/featured');

    expect(res.status).toBe(200);
    expect(res.data).toEqual({ featured: true });
  });

  it('creates a post via built-in CRUD', async () => {
    const client = createTesterAxios(config);
    const res = await client.post('/api/posts', {
      title: 'Hello World',
    });

    expect(res.status).toBe(201);
    expect(res.data.doc.title).toBe('Hello World');
  });
});
```

## Usage Recipes

### Authentication Flow

```typescript
const client = createTesterAxios(config);

// Login
const { data } = await client.post('/api/users/login', {
  email: 'admin@example.com',
  password: 'password',
});

// Set token for all subsequent requests
client.defaults.headers.common['Authorization'] = `JWT ${data.token}`;

// Now all requests are authenticated
const res = await client.get('/api/users/me');
expect(res.data.user.email).toBe('admin@example.com');
```

### Request Patching

Inject a mock user, override route parameters, or modify the request before it hits the handler:

```typescript
const client = createTesterAxios(config, {
  requestPatcher: (req) => {
    // Force a specific user for all requests
    req.user = { id: '1', email: 'mock@test.com' };
    return req;
  },
});
```

### Custom Axios Configuration

```typescript
const client = createTesterAxios(config, {
  axiosConfig: {
    timeout: 5000,
    // Don't throw on 4xx/5xx — useful for testing error responses
    validateStatus: () => true,
  },
});

const res = await client.get('/api/nonexistent');
expect(res.status).toBe(404);
```

## API Reference

### `createTesterAxios(config, options?)`

Creates an Axios instance that routes requests in-process to Payload CMS handlers.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `config` | `SanitizedConfig` | The sanitized config returned by `buildConfig()` |
| `options.requestPatcher` | `(req: PayloadRequest) => PayloadRequest \| Promise<PayloadRequest>` | Mutate the request before handler execution |
| `options.axiosConfig` | `AxiosRequestConfig` | Default Axios configuration for the instance |

**Returns:** `AxiosInstance` — a standard Axios client.

---

### Exported Utilities

| Export | Description |
|--------|-------------|
| `createTesterAxios` | Main entry point — creates the test Axios client |
| `createAxiosAdapter` | Lower-level adapter if you need custom Axios setup |
| `matchEndpoint` | Manually match a path/method to a Payload endpoint |
| `matchRoute` | Pattern matching utility for Express-style `:param` routes |
| `buildPayloadRequest` | Construct a `PayloadRequest` from raw URL, method, headers |
| `EndpointNotFoundError` | Thrown when no matching endpoint is found |
| `HandlerExecutionError` | Thrown when a handler throws during execution |

## How It Works

```
createTesterAxios(config)
        │
        ▼
   Axios Instance
   (custom adapter)
        │
   client.get('/api/posts/featured')
        │
        ▼
  ┌─────────────────┐
  │ matchEndpoint()  │  ← Resolves handler + route params
  └────────┬────────┘
           ▼
  ┌─────────────────┐
  │ buildPayload     │  ← Creates PayloadRequest with
  │ Request()        │    auth, headers, body, transaction
  └────────┬────────┘
           ▼
  ┌─────────────────┐
  │ requestPatcher() │  ← Optional mutation hook
  └────────┬────────┘
           ▼
  ┌─────────────────┐
  │ handler(req)     │  ← Your endpoint handler runs
  └────────┬────────┘
           ▼
  ┌─────────────────┐
  │ Response →       │  ← Converted to AxiosResponse
  │ AxiosResponse    │
  └─────────────────┘
```

## Contributing

Contributions are welcome! Please feel free to open an issue or submit a pull request.

```bash
# Clone and install
git clone https://github.com/000MaDz000/payload-test-api-route-handler.git
cd payload-test-api-route-handler
pnpm install

# Run tests
pnpm test

# Build
pnpm build

# Lint & format
pnpm lint
pnpm format
```

## License

[MIT](LICENSE) © MaDz
