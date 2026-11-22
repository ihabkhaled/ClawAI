import 'reflect-metadata';
import { afterEach, describe, expect, it, vi } from 'vitest';

function stubEnv(): void {
  vi.stubEnv('JWT_SECRET', 'x'.repeat(32));
  vi.stubEnv('LIVE_DATABASE_URL', 'postgresql://localhost:5432/claw_live');
  vi.stubEnv('REDIS_URL', 'redis://localhost:6379');
  vi.stubEnv('AUTH_SERVICE_URL', 'https://auth-service:4001');
  vi.stubEnv('CHAT_SERVICE_URL', 'https://chat-service:4002');
  vi.stubEnv('CONNECTOR_SERVICE_URL', 'https://connector-service:4003');
  vi.stubEnv('FILE_SERVICE_URL', 'https://file-service:4005');
  vi.stubEnv('FILE_GENERATION_SERVICE_URL', 'https://file-generation-service:4013');
  vi.stubEnv('INTER_SERVICE_AUTH_TOKEN', 'x'.repeat(32));
}

describe('Live AppModule', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('wires health, the database, redis and the auth and revocation guards', async () => {
    stubEnv();
    const { AuthGuard, SessionRevocationGuard } = await import('@claw/shared-auth');
    const { AppModule } = await import('../app.module');
    const { HealthModule } = await import('../../modules/health/health.module');
    const { RedisModule } = await import('../../infrastructure/redis/redis.module');
    const imports = Reflect.getMetadata('imports', AppModule) as unknown[];
    const providers = Reflect.getMetadata('providers', AppModule) as Array<{
      useClass?: unknown;
    }>;

    expect(imports).toEqual(expect.arrayContaining([HealthModule, RedisModule]));
    expect(providers.some((provider) => provider.useClass === AuthGuard)).toBe(true);
    expect(providers.some((provider) => provider.useClass === SessionRevocationGuard)).toBe(true);
  });

  it('refuses to boot without the database url', async () => {
    stubEnv();
    vi.stubEnv('LIVE_DATABASE_URL', '');
    vi.resetModules();

    await expect(import('../app.module')).rejects.toThrow('LIVE_DATABASE_URL');
  });
});
