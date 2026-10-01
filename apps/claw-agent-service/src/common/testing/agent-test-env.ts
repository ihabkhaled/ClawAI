import { AppConfig } from '../../app/config/app.config';

export const TEST_JWT_SECRET = 'test-jwt-secret-test-jwt-secret-1234567890';

/** Boots AppConfig against a throwaway environment so token code can run in a unit test. */
export function useAgentTestConfig(overrides: Record<string, string> = {}): void {
  Object.assign(process.env, {
    AGENT_DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    REDIS_URL: 'redis://localhost:6379',
    RABBITMQ_URL: 'amqp://localhost:5672',
    JWT_SECRET: TEST_JWT_SECRET,
    ENCRYPTION_KEY: 'a'.repeat(64),
    INTER_SERVICE_AUTH_TOKEN: 'inter-service-token-inter-service-token-12',
    ...overrides,
  });
  AppConfig.validate();
}
