import type { FastifyInstance } from 'fastify';
import { buildApp, type BuildAppOptions } from '../app';
import { type AppConfig, loadConfig } from '../core/config';

/** A valid test config; pass env overrides to tweak it. */
export function testConfig(overrides: Record<string, string> = {}): AppConfig {
  return loadConfig({ NODE_ENV: 'test', ...overrides });
}

/** Builds a ready-to-inject app instance. Remember to `await app.close()` in afterEach/afterAll. */
export async function buildTestApp(
  overrides: Record<string, string> = {},
  options: BuildAppOptions = {},
): Promise<FastifyInstance> {
  const app = await buildApp(testConfig(overrides), options);
  await app.ready();
  return app;
}
