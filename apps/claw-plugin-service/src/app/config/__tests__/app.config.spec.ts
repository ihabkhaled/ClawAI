import { AppConfig } from '../app.config';

const DATABASE_URL = 'postgresql://claw:claw_secret@localhost:5432/claw_plugin';

describe('AppConfig', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('loads the configured service port, database and host', () => {
    vi.stubEnv('JWT_SECRET', 'x'.repeat(32));
    vi.stubEnv('PLUGIN_SERVICE_PORT', '4021');
    vi.stubEnv('PLUGIN_DATABASE_URL', DATABASE_URL);
    vi.stubEnv('AUTH_SERVICE_URL', 'https://auth-service:4001');
    vi.stubEnv('INTER_SERVICE_AUTH_TOKEN', 'y'.repeat(32));
    vi.stubEnv('CLAW_HOSTNAME', 'plugins.test');

    expect(AppConfig.validate()).toMatchObject({
      PLUGIN_SERVICE_PORT: 4021,
      PLUGIN_DATABASE_URL: DATABASE_URL,
      AUTH_SERVICE_URL: 'https://auth-service:4001',
      CLAW_HOSTNAME: 'plugins.test',
    });
  });

  it('defaults the port to 4021', () => {
    vi.stubEnv('JWT_SECRET', 'x'.repeat(32));
    vi.stubEnv('PLUGIN_DATABASE_URL', DATABASE_URL);
    vi.stubEnv('AUTH_SERVICE_URL', 'https://auth-service:4001');
    vi.stubEnv('INTER_SERVICE_AUTH_TOKEN', 'y'.repeat(32));
    delete process.env['PLUGIN_SERVICE_PORT'];

    expect(AppConfig.validate().PLUGIN_SERVICE_PORT).toBe(4021);
  });

  it('rejects a malformed service port', () => {
    vi.stubEnv('JWT_SECRET', 'x'.repeat(32));
    vi.stubEnv('PLUGIN_SERVICE_PORT', 'invalid');
    vi.stubEnv('PLUGIN_DATABASE_URL', DATABASE_URL);
    vi.stubEnv('AUTH_SERVICE_URL', 'https://auth-service:4001');
    vi.stubEnv('INTER_SERVICE_AUTH_TOKEN', 'y'.repeat(32));

    expect(() => AppConfig.validate()).toThrow('Invalid environment configuration');
  });

  it('rejects a missing database url and a short service token', () => {
    vi.stubEnv('JWT_SECRET', 'x'.repeat(32));
    vi.stubEnv('PLUGIN_DATABASE_URL', '');
    vi.stubEnv('AUTH_SERVICE_URL', 'https://auth-service:4001');
    vi.stubEnv('INTER_SERVICE_AUTH_TOKEN', 'short');

    expect(() => AppConfig.validate()).toThrow('PLUGIN_DATABASE_URL');
  });
});
