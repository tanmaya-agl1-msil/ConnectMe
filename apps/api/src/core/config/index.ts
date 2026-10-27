import { resolve } from 'node:path';
import { z } from 'zod';

/** Splits a comma-separated env value into a trimmed, non-empty string list. */
const csv = z
  .string()
  .default('')
  .transform((value) =>
    value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  );

const EnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    HOST: z.string().min(1).default('0.0.0.0'),
    PORT: z.coerce.number().int().min(1).max(65535).default(8443),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    TLS_CERT_FILE: z.string().min(1).optional(),
    TLS_KEY_FILE: z.string().min(1).optional(),
    CORS_ORIGINS: csv.pipe(z.array(z.url({ protocol: /^https$/ }))),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
    DISABLED_MODULES: csv,
  })
  .superRefine((env, ctx) => {
    // HTTPS is mandatory everywhere except in-process tests (which use app.inject, no sockets).
    if (env.NODE_ENV !== 'test') {
      for (const key of ['TLS_CERT_FILE', 'TLS_KEY_FILE'] as const) {
        if (!env[key]) {
          ctx.addIssue({
            code: 'custom',
            path: [key],
            message: `${key} is required (TLS is mandatory). Run "npm run certs" to create dev certificates.`,
          });
        }
      }
    }
  });

export interface AppConfig {
  env: 'development' | 'test' | 'production';
  isProduction: boolean;
  isTest: boolean;
  host: string;
  port: number;
  logLevel: z.infer<typeof EnvSchema>['LOG_LEVEL'];
  /** Absolute paths to the TLS certificate and key. Undefined only when env is "test". */
  tls?: { certFile: string; keyFile: string };
  cors: { origins: string[] };
  rateLimit: { max: number; windowMs: number };
  disabledModules: ReadonlySet<string>;
}

export class ConfigError extends Error {
  constructor(public readonly issues: string[]) {
    super(`Invalid configuration:\n  - ${issues.join('\n  - ')}`);
    this.name = 'ConfigError';
  }
}

/**
 * Validates environment variables and returns a typed, frozen config.
 * Error messages name the offending variable but never echo its value (values may be secrets).
 */
export function loadConfig(
  env: NodeJS.ProcessEnv = process.env,
  cwd: string = process.cwd(),
): AppConfig {
  // Treat empty strings ("FOO=") as unset so defaults and "required" checks apply.
  const cleaned = Object.fromEntries(
    Object.entries(env).filter(([, value]) => value !== undefined && value !== ''),
  );

  const parsed = EnvSchema.safeParse(cleaned);
  if (!parsed.success) {
    throw new ConfigError(
      parsed.error.issues.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`),
    );
  }

  const e = parsed.data;
  const config: AppConfig = {
    env: e.NODE_ENV,
    isProduction: e.NODE_ENV === 'production',
    isTest: e.NODE_ENV === 'test',
    host: e.HOST,
    port: e.PORT,
    logLevel: e.LOG_LEVEL,
    tls:
      e.TLS_CERT_FILE && e.TLS_KEY_FILE
        ? { certFile: resolve(cwd, e.TLS_CERT_FILE), keyFile: resolve(cwd, e.TLS_KEY_FILE) }
        : undefined,
    cors: { origins: e.CORS_ORIGINS },
    rateLimit: { max: e.RATE_LIMIT_MAX, windowMs: e.RATE_LIMIT_WINDOW_MS },
    disabledModules: new Set(e.DISABLED_MODULES),
  };
  return Object.freeze(config);
}
