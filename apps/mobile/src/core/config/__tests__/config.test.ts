import { DEFAULT_API_URL, InsecureConfigError, resolveApiBaseUrl } from '..';

describe('resolveApiBaseUrl', () => {
  it('falls back to the emulator default', () => {
    expect(resolveApiBaseUrl(undefined)).toBe(DEFAULT_API_URL);
    expect(resolveApiBaseUrl('  ')).toBe(DEFAULT_API_URL);
  });

  it('accepts https and strips trailing slashes', () => {
    expect(resolveApiBaseUrl('https://api.example.com/')).toBe('https://api.example.com');
  });

  it('rejects plaintext and invalid URLs', () => {
    expect(() => resolveApiBaseUrl('http://10.0.2.2:8443')).toThrow(InsecureConfigError);
    expect(() => resolveApiBaseUrl('ws://x')).toThrow(InsecureConfigError);
    expect(() => resolveApiBaseUrl('not a url')).toThrow(InsecureConfigError);
  });
});
