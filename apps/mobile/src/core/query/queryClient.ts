import { QueryClient } from '@tanstack/react-query';
import { ApiClientError } from '../api/errors';

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        // Don't hammer the server on 4xx errors; retry transient failures once.
        retry: (failureCount, error) =>
          !(error instanceof ApiClientError && error.status < 500) && failureCount < 1,
      },
    },
  });
}
