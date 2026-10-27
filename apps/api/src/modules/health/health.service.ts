import type { HealthResponse } from '@connectme/shared';

export interface HealthService {
  getStatus(): HealthResponse;
}

/** `now` is injectable so tests can control time. */
export function createHealthService(now: () => number = Date.now): HealthService {
  const startedAt = now();
  return {
    getStatus: () => ({
      status: 'ok',
      uptimeSeconds: Math.round((now() - startedAt) / 1000),
      timestamp: new Date(now()).toISOString(),
    }),
  };
}
