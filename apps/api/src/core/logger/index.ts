import type { FastifyServerOptions } from 'fastify';
import type { AppConfig } from '../config';

export const REDACTED = '[REDACTED]';

/** Field names whose values must never reach the logs, at any of the first three nesting levels. */
const SENSITIVE_KEYS = [
  'password',
  'newPassword',
  'currentPassword',
  'passwordHash',
  'otp',
  'otpCode',
  'token',
  'accessToken',
  'refreshToken',
  'mfaToken',
  'secret',
  'privateKey',
  'email',
  'phone',
  'dob',
] as const;

export const REDACT_PATHS: string[] = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-refresh-token"]',
  'res.headers["set-cookie"]',
  ...SENSITIVE_KEYS.flatMap((key) => [key, `*.${key}`, `*.*.${key}`]),
];

/** Pino options shared by Fastify's logger and any standalone loggers. */
export function buildLoggerOptions(
  config: AppConfig,
): Exclude<FastifyServerOptions['logger'], boolean | undefined> {
  return {
    level: config.isTest ? 'silent' : config.logLevel,
    redact: { paths: REDACT_PATHS, censor: REDACTED },
    ...(config.env === 'development'
      ? {
          transport: {
            target: 'pino-pretty',
            options: { translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' },
          },
        }
      : {}),
  };
}
