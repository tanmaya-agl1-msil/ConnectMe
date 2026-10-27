import { ApiErrorSchema, HealthResponseSchema } from '@connectme/shared';

export const getHealthSchema = {
  summary: 'Liveness check',
  response: {
    200: HealthResponseSchema,
    429: ApiErrorSchema,
  },
};
