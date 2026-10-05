import 'reflect-metadata';
import { RabbitMQModule } from '@claw/shared-rabbitmq';
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('Threads AppModule', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('registers the RabbitMQ provider required by account-deletion consumers', async () => {
    vi.stubEnv('JWT_SECRET', 'x'.repeat(32));
    vi.stubEnv('THREADS_SERVICE_PORT', '4019');
    vi.stubEnv('THREADS_DATABASE_URL', 'postgresql://localhost:5432/claw_threads');
    vi.stubEnv('AUTH_SERVICE_URL', 'https://auth-service:4001');
    vi.stubEnv('THREAD_GENERATION_SERVICE_URL', 'https://thread-generation-service:4020');
    vi.stubEnv('INTER_SERVICE_AUTH_TOKEN', 'x'.repeat(32));
    vi.stubEnv('RABBITMQ_URL', 'amqp://rabbitmq:5672');

    const { AppModule } = await import('../app.module');
    const imports = Reflect.getMetadata('imports', AppModule) as Array<{ module?: unknown }>;

    expect(imports.some((module) => module?.module === RabbitMQModule)).toBe(true);
  });
});
