import type { AppModule } from '../../core/modules';
import { healthRoutes } from './health.routes';
import { createHealthService } from './health.service';

export type { HealthService } from './health.service';

export const healthModule: AppModule = {
  name: 'health',
  plugin: async (app) => {
    await app.register(healthRoutes, { service: createHealthService() });
  },
};
