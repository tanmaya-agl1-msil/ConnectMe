import { readFileSync } from 'node:fs';
import type { AppConfig } from '../config';

export interface TlsMaterial {
  cert: Buffer;
  key: Buffer;
  minVersion: 'TLSv1.2';
}

/** Reads the certificate/key pair. Fails fast with a helpful message (never prints key contents). */
export function loadTlsMaterial(tls: NonNullable<AppConfig['tls']>): TlsMaterial {
  try {
    return {
      cert: readFileSync(tls.certFile),
      key: readFileSync(tls.keyFile),
      minVersion: 'TLSv1.2',
    };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Unable to read TLS certificate/key (${reason}). Run "npm run certs" from the repo root.`,
      { cause: err },
    );
  }
}
