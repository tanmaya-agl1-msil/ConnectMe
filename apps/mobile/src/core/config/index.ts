/** Android emulator alias for the host machine's loopback interface. */
export const DEFAULT_API_URL = 'https://10.0.2.2:8443';

export class InsecureConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InsecureConfigError';
  }
}

/**
 * Validates the API base URL. Only https:// is accepted, so the app can never be pointed at a
 * plaintext endpoint by mistake. Trailing slashes are removed.
 */
export function resolveApiBaseUrl(raw: string | undefined): string {
  const value = raw && raw.trim() !== '' ? raw.trim() : DEFAULT_API_URL;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new InsecureConfigError(`EXPO_PUBLIC_API_URL is not a valid URL`);
  }
  if (url.protocol !== 'https:') {
    throw new InsecureConfigError('EXPO_PUBLIC_API_URL must use https://');
  }
  return url.toString().replace(/\/+$/, '');
}

export const appConfig = Object.freeze({
  // Expo inlines EXPO_PUBLIC_* variables at build time (static member access is required).
  apiBaseUrl: resolveApiBaseUrl(process.env.EXPO_PUBLIC_API_URL),
});
