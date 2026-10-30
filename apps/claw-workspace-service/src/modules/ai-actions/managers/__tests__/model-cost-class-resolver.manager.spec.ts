import { ModelCostClass, PlanModelAccessMode } from '@claw/shared-types';
import { vi } from 'vitest';

import { AppConfig } from '../../../../app/config/app.config';
import { costClassKey } from '../../utilities/model-cost-class-key.utility';
import { ModelCatalogResolverManager } from '../model-catalog-resolver.manager';
import { ModelCostClassResolverManager } from '../model-cost-class-resolver.manager';

const fetchMock = vi.fn();
const answer = (rows: unknown) => ({ ok: true, status: 200, json: () => Promise.resolve(rows) });

function stubConfig(): void {
  vi.spyOn(AppConfig, 'get').mockReturnValue({
    OLLAMA_SERVICE_URL: 'http://ollama-service:4008',
    CONNECTOR_SERVICE_URL: 'http://connector-service:4003',
    ROUTING_SERVICE_URL: 'https://routing-service:4004',
    AI_ACTION_MODEL_RESOLVER_TTL_SECONDS: 60,
    INTER_SERVICE_AUTH_TOKEN: 'inter-service-secret',
  } as unknown as ReturnType<typeof AppConfig.get>);
}

describe('ModelCostClassResolverManager (ADR-198)', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    stubConfig();
    ModelCostClassResolverManager.invalidateAll();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('asks routing with the service token and keys the answer so "/" cannot collide', async () => {
    fetchMock.mockResolvedValue(
      answer([{ provider: 'OPENROUTER', model: 'vendor/x', costClass: ModelCostClass.CHEAP }]),
    );

    const result = await new ModelCostClassResolverManager().resolve([
      { provider: 'OPENROUTER', model: 'vendor/x' },
    ]);

    expect(result.get(costClassKey('OPENROUTER', 'vendor/x'))).toBe(ModelCostClass.CHEAP);
    expect(result.has(costClassKey('OPENROUTER/vendor', 'x'))).toBe(false);
    const [target, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(target).toBe('https://routing-service:4004/api/v1/internal/router-models/costs/classes');
    expect(new Headers(init.headers).get('authorization')).toBe('Service inter-service-secret');
  });

  it('fails closed when routing is down and does not cache the failure', async () => {
    fetchMock
      .mockRejectedValueOnce(new Error('routing down'))
      .mockResolvedValueOnce(
        answer([{ provider: 'ACME', model: 'm', costClass: ModelCostClass.CHEAP }]),
      );
    const manager = new ModelCostClassResolverManager();
    const refs = [{ provider: 'ACME', model: 'm' }];

    expect((await manager.resolve(refs)).has(costClassKey('ACME', 'm'))).toBe(false);
    expect((await manager.resolve(refs)).get(costClassKey('ACME', 'm'))).toBe(ModelCostClass.CHEAP);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('treats a bad status or a wrong-shaped body as no answer, and reuses a good one', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: false, status: 401, json: () => Promise.resolve({}) })
      .mockResolvedValueOnce(answer({ not: 'an array' }))
      .mockResolvedValue(
        answer([
          { provider: 'ACME', model: 'm', costClass: ModelCostClass.CHEAP },
          { provider: 'EVIL', model: 'planted', costClass: ModelCostClass.FREE },
        ]),
      );
    const manager = new ModelCostClassResolverManager();
    const refs = [{ provider: 'ACME', model: 'm' }];

    expect((await manager.resolve(refs)).size).toBe(0);
    expect((await manager.resolve(refs)).size).toBe(0);
    const good = await manager.resolve(refs);
    await manager.resolve(refs);

    expect(good.has(costClassKey('EVIL', 'planted'))).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('asks in batches of at most 300 pairs', async () => {
    fetchMock.mockResolvedValue(answer([]));
    const refs = Array.from({ length: 650 }, (_, index) => ({
      provider: 'ACME',
      model: `m${String(index)}`,
    }));

    await new ModelCostClassResolverManager().resolve(refs);

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});

describe('ModelCatalogResolverManager on a cost-class plan (ADR-198)', () => {
  const freePlan = {
    isAdmin: false,
    modelAccessMode: PlanModelAccessMode.ALLOW_COST_CLASSES,
    allowedCostClasses: [ModelCostClass.FREE, ModelCostClass.CHEAP],
    allowedModels: [],
  };
  const catalog = {
    ok: true,
    status: 200,
    json: () =>
      Promise.resolve({
        providers: [
          { provider: 'P1', models: [{ modelKey: 'cheap-1' }] },
          { provider: 'P2', models: [{ modelKey: 'premium-1' }] },
          { provider: 'P3', models: [{ modelKey: 'unpriced-1' }] },
          { provider: 'P4', models: [{ modelKey: 'models/cheap-2' }] },
        ],
      }),
  };

  function resolverWith(classRows: unknown): ModelCatalogResolverManager {
    fetchMock.mockImplementation((target: string) => {
      const url = String(target);
      if (url.includes('/public-catalog')) return Promise.resolve(catalog);
      if (url.includes('/costs/classes')) {
        return classRows instanceof Error
          ? Promise.reject(classRows)
          : Promise.resolve(answer(classRows));
      }
      return Promise.resolve(answer({ models: [] }));
    });
    return new ModelCatalogResolverManager(
      { getEntitlements: vi.fn().mockResolvedValue(freePlan) } as never,
      new ModelCostClassResolverManager(),
    );
  }

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    stubConfig();
    ModelCostClassResolverManager.invalidateAll();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('lets a Free user get cheap models, and drops premium and unpriced ones', async () => {
    const resolver = resolverWith([
      { provider: 'P1', model: 'cheap-1', costClass: ModelCostClass.CHEAP },
      { provider: 'P2', model: 'premium-1', costClass: ModelCostClass.PREMIUM },
      { provider: 'P3', model: 'unpriced-1', costClass: null },
      { provider: 'P4', model: 'cheap-2', costClass: ModelCostClass.CHEAP },
    ]);

    const result = await resolver.resolveDefaults({ userId: 'u1' });
    const chosen = [result.primary, ...result.fallbackChain].map((choice) => choice?.model);

    expect(chosen).toContain('cheap-1');
    expect(chosen).toContain('models/cheap-2');
    expect(chosen).not.toContain('premium-1');
    expect(chosen).not.toContain('unpriced-1');
  });

  it('offers nothing when routing is down (fail closed)', async () => {
    const resolver = resolverWith(new Error('routing down'));

    const result = await resolver.resolveDefaults({ userId: 'u1' });

    expect(result.primary).toBeNull();
    expect(result.fallbackChain).toEqual([]);
  });
});
