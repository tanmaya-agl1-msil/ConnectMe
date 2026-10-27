import pino from 'pino';
import { REDACT_PATHS, REDACTED } from '..';

function capture(): { logger: pino.Logger; lines: () => Record<string, unknown>[] } {
  const chunks: string[] = [];
  const stream = { write: (chunk: string) => void chunks.push(chunk) };
  const logger = pino({ redact: { paths: REDACT_PATHS, censor: REDACTED } }, stream);
  return { logger, lines: () => chunks.map((c) => JSON.parse(c) as Record<string, unknown>) };
}

describe('log redaction', () => {
  it('censors credentials and personal data at top level and nested levels', () => {
    const { logger, lines } = capture();
    logger.info({
      password: 'hunter2',
      user: { email: 'a@b.c', profile: { phone: '+100' } },
      body: { refreshToken: 'rt', otp: '123456' },
      req: { headers: { authorization: 'Bearer abc', cookie: 'sid=1', host: 'x' } },
    });
    const line = lines()[0]!;
    const json = JSON.stringify(line);
    for (const secret of ['hunter2', 'a@b.c', '+100', '"rt"', '123456', 'Bearer abc', 'sid=1']) {
      expect(json).not.toContain(secret);
    }
    expect((line.req as { headers: { host: string } }).headers.host).toBe('x');
  });

  it('keeps error codes readable for debugging', () => {
    const { logger, lines } = capture();
    logger.error({ err: { code: 'FST_ERR_X', message: 'boom' } });
    expect(JSON.stringify(lines()[0])).toContain('FST_ERR_X');
  });
});
