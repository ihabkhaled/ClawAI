import { AppConfig } from '../app.config';

describe('AppConfig', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('loads the configured service port and host', () => {
    vi.stubEnv('JWT_SECRET', 'x'.repeat(32));
    vi.stubEnv('THREAD_GENERATION_SERVICE_PORT', '4020');
    vi.stubEnv('CLAW_HOSTNAME', 'generation.test');

    expect(AppConfig.validate()).toMatchObject({
      THREAD_GENERATION_SERVICE_PORT: 4020,
      CLAW_HOSTNAME: 'generation.test',
    });
  });

  it('rejects a malformed service port', () => {
    vi.stubEnv('JWT_SECRET', 'x'.repeat(32));
    vi.stubEnv('THREAD_GENERATION_SERVICE_PORT', 'invalid');

    expect(() => AppConfig.validate()).toThrow('Invalid environment configuration');
  });
});
