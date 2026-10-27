import { randomUUID } from 'node:crypto';
import type { Server as HttpsServer } from 'node:https';
import Fastify, {
  type FastifyHttpsOptions,
  type FastifyInstance,
  type FastifyServerOptions,
} from 'fastify';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import type { AppConfig } from './core/config';
import { errorHandlerPlugin } from './core/errors';
import { buildLoggerOptions } from './core/logger';
import type { AppModule } from './core/modules';
import securityPlugin from './core/security';
import type { TlsMaterial } from './core/tls';
import { healthModule } from './modules/health';

/**
 * All feature modules, in registration order. Add new modules here.
 * Any module can be switched off with DISABLED_MODULES=<name>[,<name>...].
 */
export const MODULES: readonly AppModule[] = [healthModule];

export interface BuildAppOptions {
  /** TLS material for HTTPS. Omit only in tests (app.inject doesn't open sockets). */
  tls?: TlsMaterial;
  /** Override the module list (used by tests). */
  modules?: readonly AppModule[];
}

export async function buildApp(
  config: AppConfig,
  options: BuildAppOptions = {},
): Promise<FastifyInstance> {
  if (!options.tls && !config.isTest) {
    throw new Error('Refusing to start without TLS outside of tests.');
  }

  const serverOptions: FastifyServerOptions = {
    logger: buildLoggerOptions(config),
    genReqId: () => randomUUID(),
    bodyLimit: 1024 * 1024, // 1 MiB for JSON bodies; media uploads get their own limits.
    requestTimeout: 30_000,
    return503OnClosing: true,
    trustProxy: false,
  };

  // The HTTPS overload returns an https.Server-backed instance; the rest of the app only uses
  // the server-agnostic FastifyInstance surface, so we widen it here.
  const app = (options.tls
    ? Fastify({ ...serverOptions, https: options.tls } as FastifyHttpsOptions<HttpsServer>)
    : Fastify(serverOptions)) as unknown as FastifyInstance;

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(errorHandlerPlugin);
  await app.register(securityPlugin, { config });

  for (const module of options.modules ?? MODULES) {
    if (config.disabledModules.has(module.name)) {
      app.log.warn({ module: module.name }, 'module disabled by configuration');
      continue;
    }
    await app.register(module.plugin, {
      config,
      ...(module.prefix ? { prefix: module.prefix } : {}),
    });
  }

  return app;
}
