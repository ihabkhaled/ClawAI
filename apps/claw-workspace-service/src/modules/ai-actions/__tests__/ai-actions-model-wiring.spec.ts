import 'reflect-metadata';
import { vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { ENTITLEMENTS_ADAPTER, EntitlementsModule } from '@claw/shared-entitlements';

import { ChainsModule } from '../../chains/chains.module';
import { AiActionsModule } from '../ai-actions.module';
import { AiActionExecutionManager } from '../managers/ai-action-execution.manager';
import { AutoRouterManager } from '../managers/auto-router.manager';
import { ModelCatalogResolverManager } from '../managers/model-catalog-resolver.manager';
import { ModelCostClassResolverManager } from '../managers/model-cost-class-resolver.manager';

// Module metadata reads AppConfig while the module files load (cron expressions), so the
// environment has to exist first: vi.hoisted runs before the imports above are evaluated.
vi.hoisted(() => {
  Object.assign(process.env, {
    WORKSPACE_DATABASE_URL: 'postgresql://wiring-test',
    REDIS_URL: 'redis://wiring-test',
    RABBITMQ_URL: 'amqp://wiring-test',
    JWT_SECRET: 'j'.repeat(32),
    ENCRYPTION_KEY: 'a'.repeat(64),
    INTER_SERVICE_AUTH_TOKEN: 'wiring-test-token-'.padEnd(40, 'z'),
  });
});

function metadata(key: string, target: object): unknown[] {
  const value: unknown = Reflect.getMetadata(key, target);
  return Array.isArray(value) ? value : [];
}

// A provider that gains a constructor dependency must be resolvable where it is
// listed, and every module that lists one of its consumers must be able to reach
// it. A missed provider is a boot-time crash loop in production, not a test failure.
describe('AI action model selection wiring', () => {
  it('AiActionsModule lists the resolver, the router and the executor that depend on it', () => {
    const providers = metadata('providers', AiActionsModule);
    expect(providers).toContain(ModelCatalogResolverManager);
    expect(providers).toContain(AutoRouterManager);
    expect(providers).toContain(AiActionExecutionManager);
  });

  it('ChainsModule reaches the resolver through AiActionsModule, which exports it', () => {
    expect(metadata('imports', ChainsModule)).toContain(AiActionsModule);
    expect(metadata('exports', AiActionsModule)).toContain(ModelCatalogResolverManager);
  });

  it('the resolver and router are constructible with the global entitlements adapter', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        EntitlementsModule.forRoot({
          authServiceUrl: 'http://auth-service:4001',
          interServiceToken: 'x'.repeat(32),
        }),
      ],
      providers: [ModelCostClassResolverManager, ModelCatalogResolverManager, AutoRouterManager],
    }).compile();

    expect(moduleRef.get(ModelCatalogResolverManager)).toBeInstanceOf(ModelCatalogResolverManager);
    expect(moduleRef.get(AutoRouterManager)).toBeInstanceOf(AutoRouterManager);
    expect(moduleRef.get(ENTITLEMENTS_ADAPTER)).toBeDefined();
  });
});
