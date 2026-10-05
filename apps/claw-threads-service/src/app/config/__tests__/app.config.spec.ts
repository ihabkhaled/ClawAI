import { AppConfig } from '../app.config';

describe('AppConfig', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('loads the configured service port and host', () => {
    vi.stubEnv('JWT_SECRET', 'x'.repeat(32));
    vi.stubEnv('THREADS_SERVICE_PORT', '4019');
    vi.stubEnv('THREADS_DATABASE_URL', 'postgresql://claw:claw_secret@localhost:5432/claw_threads');
    vi.stubEnv('CLAW_HOSTNAME', 'threads.test');

    expect(AppConfig.validate()).toMatchObject({
      THREADS_SERVICE_PORT: 4019,
      THREADS_DATABASE_URL: 'postgresql://claw:claw_secret@localhost:5432/claw_threads',
      CLAW_HOSTNAME: 'threads.test',
    });
  });

  it('rejects a malformed service port', () => {
    vi.stubEnv('JWT_SECRET', 'x'.repeat(32));
    vi.stubEnv('THREADS_SERVICE_PORT', 'invalid');
    vi.stubEnv('THREADS_DATABASE_URL', 'postgresql://claw:claw_secret@localhost:5432/claw_threads');

    expect(() => AppConfig.validate()).toThrow('Invalid environment configuration');
  });
});
