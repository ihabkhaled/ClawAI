import { AppConfig } from '../app.config';

const DATABASE_URL = 'postgresql://claw:claw_secret@localhost:5432/claw_plugin';
const GOOD_KEY = 'c3'.repeat(32);

function stubBaseEnv(overrides: Record<string, string> = {}): void {
  const env: Record<string, string> = {
    JWT_SECRET: 'x'.repeat(32),
    PLUGIN_DATABASE_URL: DATABASE_URL,
    AUTH_SERVICE_URL: 'https://auth-service:4001',
    INTER_SERVICE_AUTH_TOKEN: 'y'.repeat(32),
    PLUGIN_ENCRYPTION_KEY: GOOD_KEY,
    ...overrides,
  };
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
}

describe('AppConfig', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('loads the configured service port, database and host', () => {
    stubBaseEnv({ PLUGIN_SERVICE_PORT: '4021', CLAW_HOSTNAME: 'plugins.test' });

    expect(AppConfig.validate()).toMatchObject({
      PLUGIN_SERVICE_PORT: 4021,
      PLUGIN_DATABASE_URL: DATABASE_URL,
      AUTH_SERVICE_URL: 'https://auth-service:4001',
      CLAW_HOSTNAME: 'plugins.test',
      PLUGIN_ENCRYPTION_KEY: GOOD_KEY,
    });
  });

  it('defaults the port to 4021 and the broker url', () => {
    stubBaseEnv();
    delete process.env['PLUGIN_SERVICE_PORT'];
    delete process.env['RABBITMQ_URL'];

    const config = AppConfig.validate();
    expect(config.PLUGIN_SERVICE_PORT).toBe(4021);
    expect(config.RABBITMQ_URL).toBe('amqp://localhost:5672');
  });

  it('rejects a malformed service port', () => {
    stubBaseEnv({ PLUGIN_SERVICE_PORT: 'invalid' });

    expect(() => AppConfig.validate()).toThrow('Invalid environment configuration');
  });

  it('rejects a missing database url and a short service token', () => {
    stubBaseEnv({ PLUGIN_DATABASE_URL: '', INTER_SERVICE_AUTH_TOKEN: 'short' });

    expect(() => AppConfig.validate()).toThrow('PLUGIN_DATABASE_URL');
  });

  describe('PLUGIN_ENCRYPTION_KEY', () => {
    it('accepts 64 hex characters of non-zero data', () => {
      stubBaseEnv({ PLUGIN_ENCRYPTION_KEY: 'AbCdEf0123456789'.repeat(4) });

      expect(AppConfig.validate().PLUGIN_ENCRYPTION_KEY).toHaveLength(64);
    });

    it.each([
      ['the all-zero placeholder', '0'.repeat(64)],
      ['a short value', 'ab'.repeat(16)],
      ['a value that is too long', 'ab'.repeat(33)],
      ['a non-hex value', 'zz'.repeat(32)],
      ['an empty value', ''],
    ])('rejects %s with a clear error and never echoes the value', (_label, value) => {
      stubBaseEnv({ PLUGIN_ENCRYPTION_KEY: value });

      let message = '';
      try {
        AppConfig.validate();
      } catch (error) {
        message = error instanceof Error ? error.message : '';
      }
      expect(message).toContain('PLUGIN_ENCRYPTION_KEY must be 64 hex characters of random data');
      if (value.length > 0) expect(message).not.toContain(value);
    });

    it('rejects a missing key', () => {
      stubBaseEnv();
      delete process.env['PLUGIN_ENCRYPTION_KEY'];

      expect(() => AppConfig.validate()).toThrow('PLUGIN_ENCRYPTION_KEY must be 64 hex');
    });
  });
});
