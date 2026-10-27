import type { FastifyInstance } from 'fastify';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import type { AddressInfo } from 'node:net';
import type { TLSSocket } from 'node:tls';
import { generate } from 'selfsigned';
import { buildApp } from '../../../app';
import { loadConfig } from '../../config';

/** Spins up the real server over TLS and checks it serves HTTPS only. */
describe('HTTPS server', () => {
  let app: FastifyInstance;
  let port: number;
  let ca: string;

  beforeAll(async () => {
    const pems = await generate([{ name: 'commonName', value: 'localhost' }], {
      keyType: 'ec',
      algorithm: 'sha256',
      extensions: [{ name: 'subjectAltName', altNames: [{ type: 2, value: 'localhost' }] }],
    });
    ca = pems.cert;
    // Real (non-test) config: TLS is mandatory here.
    const config = loadConfig({
      NODE_ENV: 'production',
      TLS_CERT_FILE: 'unused-cert.pem',
      TLS_KEY_FILE: 'unused-key.pem',
      LOG_LEVEL: 'silent',
    });
    app = await buildApp(config, {
      tls: { cert: Buffer.from(pems.cert), key: Buffer.from(pems.private), minVersion: 'TLSv1.2' },
    });
    await app.listen({ host: '127.0.0.1', port: 0 });
    port = (app.server.address() as AddressInfo).port;
  });

  afterAll(async () => {
    await app.close();
  });

  it('serves /health over TLS with a verified certificate', async () => {
    const { status, body, protocol } = await new Promise<{
      status: number;
      body: string;
      protocol: string | null;
    }>((resolve, reject) => {
      const req = httpsRequest(
        { host: '127.0.0.1', servername: 'localhost', port, path: '/health', ca },
        (res) => {
          // Read the protocol now: the socket is detached from the response once it ends.
          const protocol = (res.socket as TLSSocket).getProtocol();
          let data = '';
          res.on('data', (c: Buffer) => (data += c.toString()));
          res.on('end', () => resolve({ status: res.statusCode ?? 0, body: data, protocol }));
        },
      );
      req.on('error', reject);
      req.end();
    });
    expect(status).toBe(200);
    expect(JSON.parse(body)).toMatchObject({ status: 'ok' });
    expect(['TLSv1.2', 'TLSv1.3']).toContain(protocol);
  });

  it('refuses plaintext HTTP on the same port', async () => {
    const outcome = await new Promise<string>((resolve) => {
      const req = httpRequest({ host: '127.0.0.1', port, path: '/health', timeout: 3000 }, (res) =>
        resolve(`status:${res.statusCode}`),
      );
      req.on('timeout', () => {
        req.destroy();
        resolve('timeout');
      });
      req.on('error', () => resolve('error'));
      req.end();
    });
    expect(outcome).not.toBe('status:200');
  });

  it('rejects TLS versions older than 1.2', async () => {
    const outcome = await new Promise<string>((resolve) => {
      const req = httpsRequest(
        {
          host: '127.0.0.1',
          servername: 'localhost',
          port,
          path: '/health',
          ca,
          maxVersion: 'TLSv1.1',
          minVersion: 'TLSv1',
        },
        () => resolve('connected'),
      );
      req.on('error', () => resolve('error'));
      req.end();
    });
    expect(outcome).toBe('error');
  });
});
