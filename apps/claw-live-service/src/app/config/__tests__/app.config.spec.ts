/// <reference types="vitest/globals" />
import { AppConfig } from '../app.config';

const DATABASE_URL = 'postgresql://claw:claw_secret@localhost:5432/claw_live';

function stubBaseEnv(overrides: Record<string, string> = {}): void {
  const env: Record<string, string> = {
    JWT_SECRET: 'x'.repeat(32),
    LIVE_DATABASE_URL: DATABASE_URL,
    REDIS_URL: 'redis://localhost:6379',
    AUTH_SERVICE_URL: 'https://auth-service:4001',
    CHAT_SERVICE_URL: 'https://chat-service:4002',
    CONNECTOR_SERVICE_URL: 'https://connector-service:4003',
    FILE_SERVICE_URL: 'https://file-service:4006',
    FILE_GENERATION_SERVICE_URL: 'https://file-generation-service:4013',
    INTER_SERVICE_AUTH_TOKEN: 'y'.repeat(32),
    ...overrides,
  };
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
}

describe('AppConfig', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('loads the configured port, database and sibling service urls', () => {
    stubBaseEnv({ LIVE_SERVICE_PORT: '4022', CLAW_HOSTNAME: 'live.test' });

    expect(AppConfig.validate()).toMatchObject({
      LIVE_SERVICE_PORT: 4022,
      LIVE_DATABASE_URL: DATABASE_URL,
      FILE_SERVICE_URL: 'https://file-service:4006',
      CLAW_HOSTNAME: 'live.test',
    });
  });

  it('defaults the port, broker, worker concurrency and keeps plain http sources off', () => {
    stubBaseEnv();
    delete process.env['LIVE_SERVICE_PORT'];
    delete process.env['RABBITMQ_URL'];
    delete process.env['LIVE_ALLOW_HTTP_SOURCES'];
    delete process.env['LIVE_WORKER_MAX_CONCURRENCY'];

    const config = AppConfig.validate();
    expect(config.LIVE_SERVICE_PORT).toBe(4022);
    expect(config.RABBITMQ_URL).toBe('amqp://localhost:5672');
    expect(config.LIVE_ALLOW_HTTP_SOURCES).toBe(false);
    expect(config.LIVE_WORKER_MAX_CONCURRENCY).toBe(4);
  });

  it('parses the http-source flag and the worker concurrency', () => {
    stubBaseEnv({ LIVE_ALLOW_HTTP_SOURCES: 'true', LIVE_WORKER_MAX_CONCURRENCY: '8' });

    const config = AppConfig.validate();
    expect(config.LIVE_ALLOW_HTTP_SOURCES).toBe(true);
    expect(config.LIVE_WORKER_MAX_CONCURRENCY).toBe(8);
  });

  it('rejects a malformed flag, port and worker concurrency', () => {
    stubBaseEnv({ LIVE_ALLOW_HTTP_SOURCES: 'yes' });
    expect(() => AppConfig.validate()).toThrow('LIVE_ALLOW_HTTP_SOURCES');

    stubBaseEnv({ LIVE_ALLOW_HTTP_SOURCES: 'false', LIVE_SERVICE_PORT: 'invalid' });
    expect(() => AppConfig.validate()).toThrow('Invalid environment configuration');

    stubBaseEnv({ LIVE_SERVICE_PORT: '4022', LIVE_WORKER_MAX_CONCURRENCY: '0' });
    expect(() => AppConfig.validate()).toThrow('LIVE_WORKER_MAX_CONCURRENCY');
  });

  it('rejects a missing database url and a short service token', () => {
    stubBaseEnv({
      LIVE_DATABASE_URL: '',
      INTER_SERVICE_AUTH_TOKEN: 'short',
      LIVE_ALLOW_HTTP_SOURCES: 'false',
      LIVE_WORKER_MAX_CONCURRENCY: '4',
    });

    expect(() => AppConfig.validate()).toThrow('LIVE_DATABASE_URL');
  });
});
