import { AppConfig } from '../app.config';

describe('AppConfig', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('loads the configured service port and host', () => {
    vi.stubEnv('JWT_SECRET', 'x'.repeat(32));
    vi.stubEnv('THREADS_SERVICE_PORT', '4019');
    vi.stubEnv('THREADS_DATABASE_URL', 'postgresql://claw:claw_secret@localhost:5432/claw_threads');
    vi.stubEnv('AUTH_SERVICE_URL', 'https://auth-service:4001');
    vi.stubEnv('THREAD_GENERATION_SERVICE_URL', 'https://thread-generation-service:4020');
    vi.stubEnv('INTER_SERVICE_AUTH_TOKEN', 'x'.repeat(32));
    vi.stubEnv('CLAW_HOSTNAME', 'threads.test');

    expect(AppConfig.validate()).toMatchObject({
      THREADS_SERVICE_PORT: 4019,
      THREADS_DATABASE_URL: 'postgresql://claw:claw_secret@localhost:5432/claw_threads',
      AUTH_SERVICE_URL: 'https://auth-service:4001',
      CLAW_HOSTNAME: 'threads.test',
    });
  });

  it('rejects a malformed service port', () => {
    vi.stubEnv('JWT_SECRET', 'x'.repeat(32));
    vi.stubEnv('THREADS_SERVICE_PORT', 'invalid');
    vi.stubEnv('THREADS_DATABASE_URL', 'postgresql://claw:claw_secret@localhost:5432/claw_threads');
    vi.stubEnv('AUTH_SERVICE_URL', 'https://auth-service:4001');

    expect(() => AppConfig.validate()).toThrow('Invalid environment configuration');
  });
});
