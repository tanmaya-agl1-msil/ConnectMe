import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { getHealthSchema } from './health.schemas';
import type { HealthService } from './health.service';

export interface HealthRoutesOptions {
  service: HealthService;
}

export const healthRoutes: FastifyPluginAsyncZod<HealthRoutesOptions> = async (
  app,
  { service },
) => {
  app.get('/health', { schema: getHealthSchema }, async () => service.getStatus());
};
