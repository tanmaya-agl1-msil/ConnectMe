import { ConfigError, loadConfig } from '..';

describe('loadConfig', () => {
  it('applies defaults in test mode without TLS', () => {
    const config = loadConfig({ NODE_ENV: 'test' });
    expect(config.port).toBe(8443);
    expect(config.tls).toBeUndefined();
    expect(config.cors.origins).toEqual([]);
    expect(config.disabledModules.size).toBe(0);
    expect(Object.isFrozen(config)).toBe(true);
  });

  it('requires TLS files outside of tests', () => {
    expect(() => loadConfig({ NODE_ENV: 'development' })).toThrow(ConfigError);
    expect(() => loadConfig({ NODE_ENV: 'production', TLS_CERT_FILE: 'c.pem' })).toThrow(
      /TLS_KEY_FILE is required/,
    );
  });

  it('treats empty values as unset', () => {
    expect(() =>
      loadConfig({ NODE_ENV: 'development', TLS_CERT_FILE: '', TLS_KEY_FILE: '' }),
    ).toThrow(/TLS_CERT_FILE is required/);
  });

  it('resolves TLS paths against the working directory', () => {
    const config = loadConfig(
      { NODE_ENV: 'development', TLS_CERT_FILE: 'certs/a.pem', TLS_KEY_FILE: 'certs/b.pem' },
      '/srv/app',
    );
    expect(config.tls?.certFile.replaceAll('\\', '/')).toMatch(/\/srv\/app\/certs\/a\.pem$/);
  });

  it('parses comma-separated lists and only accepts https CORS origins', () => {
    const config = loadConfig({
      NODE_ENV: 'test',
      CORS_ORIGINS: 'https://a.example, https://b.example',
      DISABLED_MODULES: 'health, ,posts',
    });
    expect(config.cors.origins).toEqual(['https://a.example', 'https://b.example']);
    expect([...config.disabledModules]).toEqual(['health', 'posts']);
    expect(() => loadConfig({ NODE_ENV: 'test', CORS_ORIGINS: 'http://a.example' })).toThrow(
      ConfigError,
    );
  });

  it('never echoes variable values in error messages', () => {
    const secretish = 'super-secret-value-123';
    try {
      loadConfig({ NODE_ENV: 'test', PORT: secretish });
      throw new Error('expected loadConfig to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(ConfigError);
      expect((err as Error).message).toContain('PORT');
      expect((err as Error).message).not.toContain(secretish);
    }
  });
});
