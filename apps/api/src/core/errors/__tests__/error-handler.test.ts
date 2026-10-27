import { ApiErrorSchema } from '@connectme/shared';
import type { FastifyInstance } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { errors } from '..';
import type { AppModule } from '../../modules';
import { buildTestApp } from '../../../test/helpers';

const probeRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/echo',
    { schema: { body: z.object({ name: z.string().min(2), age: z.number().int() }) } },
    async (req) => ({ name: req.body.name }),
  );
  app.get('/conflict', async () => {
    throw errors.conflict('Username taken');
  });
  app.get('/boom', async () => {
    throw new Error('database password is hunter2');
  });
};

const probeModule: AppModule = { name: 'probe', prefix: '/probe', plugin: probeRoutes };

describe('error handler', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildTestApp({}, { modules: [probeModule] });
  });
  afterAll(async () => {
    await app.close();
  });

  it('maps Zod validation failures to 400 with field details', async () => {
    const res = await app.inject({ method: 'POST', url: '/probe/echo', payload: { name: 'a' } });
    expect(res.statusCode).toBe(400);
    const body = ApiErrorSchema.parse(res.json());
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.details?.map((d) => d.path).sort()).toEqual(['age', 'name']);
  });

  it('maps AppError to its status and code', async () => {
    const res = await app.inject({ method: 'GET', url: '/probe/conflict' });
    expect(res.statusCode).toBe(409);
    expect(res.json()).toMatchObject({ error: { code: 'CONFLICT', message: 'Username taken' } });
  });

  it('hides unexpected error details from the client', async () => {
    const res = await app.inject({ method: 'GET', url: '/probe/boom' });
    expect(res.statusCode).toBe(500);
    expect(res.body).not.toContain('hunter2');
    expect(res.json()).toMatchObject({ error: { code: 'INTERNAL_ERROR' } });
  });

  it('rejects malformed JSON with 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/probe/echo',
      headers: { 'content-type': 'application/json' },
      payload: '{"name":',
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: { code: 'BAD_REQUEST' } });
  });

  it('rejects bodies over the 1 MiB limit with 413', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/probe/echo',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ name: 'x'.repeat(1024 * 1024 + 10), age: 1 }),
    });
    expect(res.statusCode).toBe(413);
    expect(res.json()).toMatchObject({ error: { code: 'PAYLOAD_TOO_LARGE' } });
  });
});
