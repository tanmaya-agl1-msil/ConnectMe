import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildApp } from './app';
import { ConfigError, loadConfig } from './core/config';
import { loadTlsMaterial } from './core/tls';

async function main(): Promise<void> {
  // Load apps/api/.env in development (no-op if the file doesn't exist).
  const envFile = resolve(process.cwd(), '.env');
  if (existsSync(envFile)) process.loadEnvFile(envFile);

  const config = loadConfig();
  if (!config.tls) throw new Error('TLS configuration missing');

  const app = await buildApp(config, { tls: loadTlsMaterial(config.tls) });

  const shutdown = async (signal: string) => {
    app.log.info({ signal }, 'shutting down');
    try {
      await app.close();
      process.exit(0);
    } catch (err) {
      app.log.error({ err }, 'error during shutdown');
      process.exit(1);
    }
  };
  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once('SIGTERM', () => void shutdown('SIGTERM'));

  await app.listen({ host: config.host, port: config.port });
}

main().catch((err: unknown) => {
  // Config errors list variable names only, never values.
  console.error(err instanceof ConfigError ? err.message : err);
  process.exit(1);
});
