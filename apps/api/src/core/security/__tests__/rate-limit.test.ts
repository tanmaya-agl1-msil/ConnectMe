import { ApiErrorSchema } from '@connectme/shared';
import { buildTestApp } from '../../../test/helpers';

describe('global rate limit', () => {
  it('returns 429 with the error envelope once the limit is exceeded', async () => {
    const app = await buildTestApp({ RATE_LIMIT_MAX: '2', RATE_LIMIT_WINDOW_MS: '60000' });
    try {
      expect((await app.inject({ url: '/health' })).statusCode).toBe(200);
      expect((await app.inject({ url: '/health' })).statusCode).toBe(200);
      const limited = await app.inject({ url: '/health' });
      expect(limited.statusCode).toBe(429);
      expect(ApiErrorSchema.parse(limited.json()).error.code).toBe('RATE_LIMITED');
      expect(limited.headers['retry-after']).toBeDefined();
    } finally {
      await app.close();
    }
  });
});
