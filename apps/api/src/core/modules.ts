import type { FastifyPluginAsync } from 'fastify';
import type { AppConfig } from './config';

export interface ModuleOptions {
  config: AppConfig;
}

/**
 * A self-contained feature module. Each module lives in `src/modules/<name>/` and is
 * registered as an encapsulated Fastify plugin, so its routes, hooks and decorators
 * don't leak into other modules. Modules can be switched off via DISABLED_MODULES.
 */
export interface AppModule {
  name: string;
  /** URL prefix for all routes in the module, e.g. "/auth". */
  prefix?: string;
  plugin: FastifyPluginAsync<ModuleOptions>;
}
