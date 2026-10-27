import { ApiErrorSchema, HealthResponseSchema } from '@connectme/shared';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from '../../../test/helpers';
import { createHealthService } from '../health.service';

describe('GET /health', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildTestApp();
  });
  afterAll(async () => {
    await app.close();
  });

  it('returns 200 with a valid health payload', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    const body = HealthResponseSchema.parse(res.json());
    expect(body.status).toBe('ok');
  });

  it('sends the expected security headers', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.headers['strict-transport-security']).toBe('max-age=31536000; includeSubDomains');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(res.headers['content-security-policy']).toBe(
      "default-src 'none';frame-ancestors 'none'",
    );
    expect(res.headers['referrer-policy']).toBe('no-referrer');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('does not allow cross-origin browser access by default', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/health',
      headers: { origin: 'https://evil.example' },
    });
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('returns the uniform error envelope for unknown routes', async () => {
    const res = await app.inject({ method: 'GET', url: '/nope' });
    expect(res.statusCode).toBe(404);
    const body = ApiErrorSchema.parse(res.json());
    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.error.requestId).toEqual(expect.any(String));
  });
});

describe('health module toggle', () => {
  it('is not registered when listed in DISABLED_MODULES', async () => {
    const app = await buildTestApp({ DISABLED_MODULES: 'health' });
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(404);
    await app.close();
  });
});

describe('createHealthService', () => {
  it('reports uptime based on the injected clock', () => {
    let now = 1_000_000;
    const service = createHealthService(() => now);
    now += 42_000;
    const status = service.getStatus();
    expect(status.uptimeSeconds).toBe(42);
    expect(status.timestamp).toBe(new Date(now).toISOString());
  });
});
