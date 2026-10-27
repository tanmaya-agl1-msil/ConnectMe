import { ApiErrorSchema, HealthResponseSchema } from '../../index';

describe('HealthResponseSchema', () => {
  it('accepts a valid health payload', () => {
    const parsed = HealthResponseSchema.parse({
      status: 'ok',
      uptimeSeconds: 12.5,
      timestamp: new Date().toISOString(),
    });
    expect(parsed.status).toBe('ok');
  });

  it('rejects unexpected status values and bad timestamps', () => {
    expect(
      HealthResponseSchema.safeParse({ status: 'down', uptimeSeconds: 1, timestamp: 'x' }).success,
    ).toBe(false);
  });
});

describe('ApiErrorSchema', () => {
  it('accepts an error envelope with details', () => {
    const ok = ApiErrorSchema.safeParse({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        details: [{ path: 'email', message: 'Required' }],
      },
    });
    expect(ok.success).toBe(true);
  });
});
