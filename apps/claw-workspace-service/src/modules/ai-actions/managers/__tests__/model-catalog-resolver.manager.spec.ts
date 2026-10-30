import { type Mock, vi } from 'vitest';

import { AppConfig } from '../../../../app/config/app.config';
import { ModelCatalogResolverManager } from '../model-catalog-resolver.manager';

type CatalogModel = {
  modelKey: string;
  displayName?: string;
  maxContextTokens?: number | null;
  usageTier?: string | null;
  supportsStructuredOutput?: boolean;
  supportsTools?: boolean;
};

const fetchMock = vi.fn();
const noClasses = { resolve: vi.fn().mockResolvedValue(new Map()) } as never;

function catalogResponse(providers: { provider: string; models: CatalogModel[] }[]): unknown {
  return { ok: true, status: 200, json: () => Promise.resolve({ providers }) };
}

function route(handlers: { catalog: () => unknown; installed?: () => unknown }): void {
  fetchMock.mockImplementation((target: string) => {
    if (String(target).includes('/public-catalog')) return Promise.resolve(handlers.catalog());
    return Promise.resolve(
      handlers.installed?.() ?? {
        ok: true,
        status: 200,
        json: () => Promise.resolve({ models: [] }),
      },
    );
  });
}

function makeResolver(entitlements: { getEntitlements: Mock }): ModelCatalogResolverManager {
  return new ModelCatalogResolverManager(entitlements as never, noClasses);
}

const allowAll = { isAdmin: false, modelAccessMode: 'ALLOW_ALL', allowedModels: [] };

function allowlist(provider: string, model: string): unknown {
  return {
    isAdmin: false,
    modelAccessMode: 'ALLOWLIST',
    allowedModels: [
      { provider, model, isAllowed: true, allowAsPrimary: true, allowAsFallback: true },
    ],
  };
}

describe('ModelCatalogResolverManager (AUTO model choice)', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(AppConfig, 'get').mockReturnValue({
      OLLAMA_SERVICE_URL: 'http://ollama-service:4008',
      CONNECTOR_SERVICE_URL: 'http://connector-service:4003',
      AI_ACTION_MODEL_RESOLVER_TTL_SECONDS: 60,
      INTER_SERVICE_AUTH_TOKEN: 'inter-service-secret',
    } as unknown as ReturnType<typeof AppConfig.get>);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('picks a cloud model from the public catalog when no local model is installed', async () => {
    route({
      catalog: () =>
        catalogResponse([
          { provider: 'ACME', models: [{ modelKey: 'acme-1', displayName: 'Acme One' }] },
        ]),
    });
    const entitlements = { getEntitlements: vi.fn().mockResolvedValue(allowAll) };

    const result = await makeResolver(entitlements).resolveDefaults({
      preferLocal: true,
      userId: 'u1',
    });

    expect(result.primary).toEqual({
      provider: 'ACME',
      model: 'acme-1',
      displayName: 'Acme One',
    });
  });

  it('reads the catalog with the service token', async () => {
    route({ catalog: () => catalogResponse([]) });
    await makeResolver({ getEntitlements: vi.fn() }).resolveDefaults();
    const call = fetchMock.mock.calls.find(([target]) =>
      String(target).includes('/api/v1/internal/connectors/public-catalog'),
    ) as [string, RequestInit] | undefined;
    expect(call).toBeDefined();
    expect(new Headers(call?.[1].headers).get('authorization')).toBe(
      'Service inter-service-secret',
    );
  });

  it('returns no primary (not a placeholder model) when nothing is available', async () => {
    route({ catalog: () => catalogResponse([]) });
    const entitlements = { getEntitlements: vi.fn().mockResolvedValue(allowAll) };

    const result = await makeResolver(entitlements).resolveDefaults({
      preferLocal: true,
      userId: 'u1',
    });

    expect(result).toEqual({ primary: null, fallbackChain: [] });
  });

  it('drops models the plan does not allow as a primary', async () => {
    route({
      catalog: () =>
        catalogResponse([
          { provider: 'ACME', models: [{ modelKey: 'acme-pro' }, { modelKey: 'acme-lite' }] },
          { provider: 'OTHER', models: [{ modelKey: 'other-1' }] },
        ]),
    });
    const entitlements = {
      getEntitlements: vi.fn().mockResolvedValue(allowlist('ACME', 'acme-lite')),
    };

    const result = await makeResolver(entitlements).resolveDefaults({ userId: 'u1' });

    expect(result.primary?.model).toBe('acme-lite');
    expect(result.fallbackChain).toEqual([]);
    expect(entitlements.getEntitlements).toHaveBeenCalledWith('u1', { enforceTrial: false });
  });

  it('matches a plan entry written without the models/ prefix', async () => {
    route({
      catalog: () =>
        catalogResponse([{ provider: 'ACME', models: [{ modelKey: 'models/acme-2' }] }]),
    });
    const entitlements = {
      getEntitlements: vi.fn().mockResolvedValue(allowlist('ACME', 'acme-2')),
    };

    const result = await makeResolver(entitlements).resolveDefaults({ userId: 'u1' });

    expect(result.primary?.model).toBe('models/acme-2');
  });

  it('orders providers by fit then by the cheaper cost band, and caps the chain', async () => {
    route({
      catalog: () =>
        catalogResponse([
          { provider: 'P1', models: [{ modelKey: 'm', usageTier: 'HIGH' }] },
          {
            provider: 'P2',
            models: [{ modelKey: 'm', usageTier: 'LOW', supportsStructuredOutput: true }],
          },
          { provider: 'P3', models: [{ modelKey: 'm', usageTier: 'LOW' }] },
          { provider: 'P4', models: [{ modelKey: 'm', usageTier: 'MEDIUM' }] },
          { provider: 'P5', models: [{ modelKey: 'm', usageTier: 'LOW' }] },
        ]),
    });
    const entitlements = { getEntitlements: vi.fn().mockResolvedValue(allowAll) };

    const result = await makeResolver(entitlements).resolveDefaults({
      userId: 'u1',
      capabilityHints: ['structured_output'],
    });

    expect(result.primary?.provider).toBe('P2');
    expect(result.fallbackChain.map((c) => c.provider)).toEqual(['P3', 'P5', 'P4']);
  });

  it('puts a local model first only when local is preferred', async () => {
    route({
      catalog: () => catalogResponse([{ provider: 'ACME', models: [{ modelKey: 'acme-1' }] }]),
      installed: () => ({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            models: [
              {
                id: '1',
                name: 'llama',
                tag: '3',
                category: null,
                roles: [],
                capabilities: [],
                parameterCount: null,
              },
            ],
          }),
      }),
    });
    const entitlements = { getEntitlements: vi.fn().mockResolvedValue(allowAll) };
    const resolver = makeResolver(entitlements);

    const localFirst = await resolver.resolveDefaults({ preferLocal: true, userId: 'u1' });
    const cloudFirst = await resolver.resolveDefaults({ preferLocal: false, userId: 'u1' });

    expect(localFirst.primary?.provider).toBe('local-ollama');
    expect(cloudFirst.primary?.provider).toBe('ACME');
    expect(cloudFirst.fallbackChain.at(-1)?.provider).toBe('local-ollama');
  });

  it('fails with a coded 503 when the plan cannot be looked up', async () => {
    route({
      catalog: () => catalogResponse([{ provider: 'ACME', models: [{ modelKey: 'acme-1' }] }]),
    });
    const entitlements = { getEntitlements: vi.fn().mockRejectedValue(new Error('auth down')) };

    await expect(
      makeResolver(entitlements).resolveDefaults({ userId: 'u1' }),
    ).rejects.toMatchObject({ code: 'AI_ACTION_PLAN_LOOKUP_UNAVAILABLE', status: 503 });
  });

  it('does not cache a catalog that could not be read for the full TTL', async () => {
    let healthy = false;
    route({
      catalog: () =>
        healthy
          ? catalogResponse([{ provider: 'ACME', models: [{ modelKey: 'acme-1' }] }])
          : { ok: false, status: 503, json: () => Promise.resolve({}) },
    });
    const entitlements = { getEntitlements: vi.fn().mockResolvedValue(allowAll) };
    const resolver = makeResolver(entitlements);
    const clock = vi.spyOn(Date, 'now');
    clock.mockReturnValue(1_000_000);

    expect((await resolver.resolveDefaults({ userId: 'u1' })).primary).toBeNull();
    healthy = true;
    clock.mockReturnValue(1_020_000);
    expect((await resolver.resolveDefaults({ userId: 'u1' })).primary?.model).toBe('acme-1');
  });

  it('treats an unexpected catalog shape as no cloud models', async () => {
    route({ catalog: () => ({ ok: true, status: 200, json: () => Promise.resolve({ x: 1 }) }) });
    const entitlements = { getEntitlements: vi.fn().mockResolvedValue(allowAll) };

    const result = await makeResolver(entitlements).resolveDefaults({ userId: 'u1' });

    expect(result.primary).toBeNull();
  });
});
