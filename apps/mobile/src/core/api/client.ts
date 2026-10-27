import { ApiErrorSchema } from '@connectme/shared';
import type { ZodType } from 'zod';
import { ApiClientError, InsecureTransportError, NetworkError } from './errors';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RequestOptions {
  body?: unknown;
  signal?: AbortSignal;
}

export interface ApiClient {
  readonly baseUrl: string;
  request<T>(
    method: HttpMethod,
    path: string,
    schema: ZodType<T>,
    options?: RequestOptions,
  ): Promise<T>;
  get<T>(path: string, schema: ZodType<T>, options?: Omit<RequestOptions, 'body'>): Promise<T>;
  post<T>(path: string, schema: ZodType<T>, body?: unknown): Promise<T>;
}

export interface ApiClientOptions {
  baseUrl: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

export function assertHttps(url: string): void {
  let protocol: string;
  try {
    protocol = new URL(url).protocol;
  } catch {
    throw new InsecureTransportError(url);
  }
  if (protocol !== 'https:') throw new InsecureTransportError(url);
}

function parseJson(text: string): unknown {
  if (text === '') return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/**
 * Minimal typed HTTP client. Every response is validated against a Zod schema, so the UI only
 * ever sees data in the expected shape. Token handling/refresh is added in the auth task.
 */
export function createApiClient({
  baseUrl,
  // Resolve the global lazily so polyfills/mocks installed after module load are honoured.
  fetchImpl = (input, init) => fetch(input, init),
  timeoutMs = 15_000,
}: ApiClientOptions): ApiClient {
  assertHttps(baseUrl);
  const root = baseUrl.replace(/\/+$/, '');

  async function request<T>(
    method: HttpMethod,
    path: string,
    schema: ZodType<T>,
    options: RequestOptions = {},
  ): Promise<T> {
    const url = `${root}${path.startsWith('/') ? path : `/${path}`}`;
    assertHttps(url);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    options.signal?.addEventListener('abort', () => controller.abort());

    let response: Response;
    try {
      response = await fetchImpl(url, {
        method,
        headers: {
          Accept: 'application/json',
          ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        },
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });
    } catch (err) {
      throw new NetworkError(
        controller.signal.aborted ? 'Request timed out' : 'Unable to reach the server',
        err,
      );
    } finally {
      clearTimeout(timer);
    }

    const payload = parseJson(await response.text());

    if (!response.ok) {
      const parsed = ApiErrorSchema.safeParse(payload);
      if (parsed.success) {
        const { code, message, requestId } = parsed.data.error;
        throw new ApiClientError(response.status, code, message, requestId);
      }
      throw new ApiClientError(response.status, 'UNKNOWN', `Request failed (${response.status})`);
    }

    const result = schema.safeParse(payload);
    if (!result.success) {
      throw new ApiClientError(
        response.status,
        'INVALID_RESPONSE',
        'Unexpected response from server',
      );
    }
    return result.data;
  }

  return {
    baseUrl: root,
    request,
    get: (path, schema, options) => request('GET', path, schema, options),
    post: (path, schema, body) => request('POST', path, schema, { body }),
  };
}
