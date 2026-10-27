#!/usr/bin/env node
/**
 * Generates locally-trusted TLS certificates for development using mkcert.
 *
 *   npm run certs            -> localhost, 127.0.0.1, ::1, 10.0.2.2 (Android emulator host)
 *   npm run certs -- --lan   -> additionally includes this machine's LAN IPv4 addresses
 *                               (needed when testing on a physical phone over Wi-Fi)
 *
 * Output (all gitignored):
 *   certs/dev-cert.pem  server certificate used by the API
 *   certs/dev-key.pem   server private key used by the API
 *   certs/rootCA.pem    PUBLIC mkcert root CA certificate; bundled into Android DEBUG builds only
 *
 * The mkcert root CA *private key* never leaves mkcert's CAROOT directory.
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const certDir = join(root, 'certs');

/**
 * Finds the mkcert binary. Order: MKCERT_PATH env var, winget's install folders (terminals opened
 * before `winget install` don't see the updated PATH), then plain "mkcert" from PATH.
 */
function findMkcert() {
  if (process.env.MKCERT_PATH && existsSync(process.env.MKCERT_PATH))
    return process.env.MKCERT_PATH;
  if (process.platform === 'win32' && process.env.LOCALAPPDATA) {
    const winget = join(process.env.LOCALAPPDATA, 'Microsoft', 'WinGet');
    const link = join(winget, 'Links', 'mkcert.exe');
    if (existsSync(link)) return link;
    const packages = join(winget, 'Packages');
    if (existsSync(packages)) {
      for (const dir of readdirSync(packages)) {
        if (!dir.startsWith('FiloSottile.mkcert')) continue;
        const exe = join(packages, dir, 'mkcert.exe');
        if (existsSync(exe)) return exe;
      }
    }
  }
  return 'mkcert';
}

const mkcert = findMkcert();

function run(args, { capture = false } = {}) {
  const result = spawnSync(mkcert, args, {
    stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
    encoding: 'utf8',
    shell: false,
    // Only the OS trust store is needed (browsers on this PC). Without this, mkcert also edits the
    // JDK's cacerts when JAVA_HOME is set, which needs admin rights and nothing here uses it.
    // Override with TRUST_STORES=system,java,nss if you really want those too.
    env: { ...process.env, TRUST_STORES: process.env.TRUST_STORES ?? 'system' },
  });
  if (result.error) {
    if (result.error.code === 'ENOENT') {
      console.error(
        '\nmkcert is not installed.\n' +
          '  Windows: winget install FiloSottile.mkcert   (or: choco install mkcert)\n' +
          '  macOS:   brew install mkcert\n' +
          'Then re-run: npm run certs\n',
      );
      process.exit(1);
    }
    throw result.error;
  }
  if (result.status !== 0) {
    console.error(`mkcert ${args.join(' ')} failed with exit code ${result.status}`);
    process.exit(result.status ?? 1);
  }
  return capture ? result.stdout.trim() : '';
}

function lanAddresses() {
  return Object.values(networkInterfaces())
    .flat()
    .filter((i) => i && i.family === 'IPv4' && !i.internal)
    .map((i) => i.address);
}

const hosts = ['localhost', '127.0.0.1', '::1', '10.0.2.2'];
if (process.argv.includes('--lan')) hosts.push(...lanAddresses());

mkdirSync(certDir, { recursive: true });

// Installs the mkcert root CA into the OS / browser trust stores (one-time, may prompt).
run(['-install']);

run([
  '-cert-file',
  join(certDir, 'dev-cert.pem'),
  '-key-file',
  join(certDir, 'dev-key.pem'),
  ...hosts,
]);

const caRoot = run(['-CAROOT'], { capture: true });
const caCert = join(caRoot, 'rootCA.pem');
if (!existsSync(caCert)) {
  console.error(`Could not find mkcert root CA certificate at ${caCert}`);
  process.exit(1);
}
copyFileSync(caCert, join(certDir, 'rootCA.pem'));

console.log(`\nCertificates written to ${certDir}`);
console.log(`Hosts: ${hosts.join(', ')}`);
console.log('Rebuild the Android dev client (npm run android) so it picks up certs/rootCA.pem.');
