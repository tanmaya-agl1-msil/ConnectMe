import { z } from 'zod';
import { ApiClientError, createApiClient, InsecureTransportError, NetworkError } from '..';

const Schema = z.object({ ok: z.boolean() });

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('createApiClient', () => {
  it('refuses a non-https base URL', () => {
    expect(() => createApiClient({ baseUrl: 'http://10.0.2.2:8443' })).toThrow(
      InsecureTransportError,
    );
  });

  it('sends JSON requests to the right URL and validates the response', async () => {
    const fetchImpl = jest.fn(async () => jsonResponse(200, { ok: true }));
    const client = createApiClient({ baseUrl: 'https://api.test/', fetchImpl });
    await expect(client.post('/things', Schema, { a: 1 })).resolves.toEqual({ ok: true });
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.test/things',
      expect.objectContaining({
        method: 'POST',
        body: '{"a":1}',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      }),
    );
  });

  it('maps the server error envelope to ApiClientError', async () => {
    const fetchImpl = jest.fn(async () =>
      jsonResponse(409, { error: { code: 'CONFLICT', message: 'Taken', requestId: 'r1' } }),
    );
    const client = createApiClient({ baseUrl: 'https://api.test', fetchImpl });
    await expect(client.get('/x', Schema)).rejects.toMatchObject({
      name: 'ApiClientError',
      status: 409,
      code: 'CONFLICT',
      requestId: 'r1',
    });
  });

  it('rejects responses that do not match the schema', async () => {
    const fetchImpl = jest.fn(async () => jsonResponse(200, { ok: 'yes' }));
    const client = createApiClient({ baseUrl: 'https://api.test', fetchImpl });
    const error = await client.get('/x', Schema).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiClientError);
    expect((error as ApiClientError).code).toBe('INVALID_RESPONSE');
  });

  it('wraps transport failures in NetworkError', async () => {
    const fetchImpl = jest.fn(async () => {
      throw new TypeError('Network request failed');
    });
    const client = createApiClient({ baseUrl: 'https://api.test', fetchImpl });
    await expect(client.get('/x', Schema)).rejects.toBeInstanceOf(NetworkError);
  });

  it('times out slow requests', async () => {
    const fetchImpl = jest.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    );
    const client = createApiClient({
      baseUrl: 'https://api.test',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      timeoutMs: 10,
    });
    await expect(client.get('/x', Schema)).rejects.toThrow('Request timed out');
  });
});
