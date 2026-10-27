import { type HealthResponse, HealthResponseSchema } from '@connectme/shared';
import { type ApiClient, apiClient } from '../../core/api';

export function fetchHealth(client: ApiClient = apiClient): Promise<HealthResponse> {
  return client.get('/health', HealthResponseSchema);
}

export type PlaintextProbeResult = 'blocked' | 'allowed';

/**
 * Demonstrates transport security: tries the same host over plain http:// on purpose,
 * bypassing the API client's https guard. Android's network security config (and the
 * TLS-only server) should make this fail. Any HTTP response at all means plaintext got through.
 */
export async function probePlaintext(
  baseUrl: string = apiClient.baseUrl,
  fetchImpl: typeof fetch = fetch,
  timeoutMs = 5_000,
): Promise<PlaintextProbeResult> {
  const url = new URL(baseUrl);
  url.protocol = 'http:';
  url.pathname = '/health';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    await fetchImpl(url.toString(), { signal: controller.signal });
    return 'allowed';
  } catch {
    return 'blocked';
  } finally {
    clearTimeout(timer);
  }
}
