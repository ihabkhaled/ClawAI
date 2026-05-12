import { Test, type TestingModule } from '@nestjs/testing';
import { RouterModelRegistryManager } from '../../router-models/managers/router-model-registry.manager';
import { RouterModelRegistryRepository } from '../../router-models/repositories/router-model-registry.repository';
import { RouterSyncManager } from '../managers/router-sync.manager';

const originalFetch = globalThis.fetch;

function mock200(models: unknown[]): jest.Mock {
  return jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ models }),
  });
}

function mock404(): jest.Mock {
  return jest.fn().mockResolvedValue({ ok: false, status: 404, json: () => Promise.resolve({}) });
}

describe('RouterSyncManager', () => {
  let manager: RouterSyncManager;
  let registryRepo: jest.Mocked<RouterModelRegistryRepository>;
  let registryManager: jest.Mocked<RouterModelRegistryManager>;

  beforeEach(async () => {
    registryRepo = {
      findByProviderAndModelKey: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockResolvedValue({ id: 'r1' }),
    } as unknown as jest.Mocked<RouterModelRegistryRepository>;
    registryManager = {
      getProtectedFieldNames: jest.fn().mockResolvedValue(new Set<string>()),
    } as unknown as jest.Mocked<RouterModelRegistryManager>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RouterSyncManager,
        { provide: RouterModelRegistryRepository, useValue: registryRepo },
        { provide: RouterModelRegistryManager, useValue: registryManager },
      ],
    }).compile();
    manager = module.get<RouterSyncManager>(RouterSyncManager);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('upserts every upstream model returned by the snapshot endpoints', async () => {
    globalThis.fetch = mock200([
      { provider: 'OPENAI', modelKey: 'gpt-4o', displayName: 'GPT-4o' },
      { provider: 'OPENAI', modelKey: 'gpt-4o-mini', displayName: 'GPT-4o Mini' },
    ]) as unknown as typeof fetch;

    const result = await manager.syncAll();
    expect(result.totals.upsertedCount).toBeGreaterThanOrEqual(2);
    expect(registryRepo.upsert).toHaveBeenCalled();
    expect(result.perProvider.length).toBe(3);
  });

  it('treats 404 from an upstream as UPSTREAM_404 (not an error)', async () => {
    globalThis.fetch = mock404() as unknown as typeof fetch;

    const result = await manager.syncAll();
    for (const p of result.perProvider) {
      expect(p.status).toBe('UPSTREAM_404');
      expect(p.upstreamCount).toBe(0);
    }
    expect(result.totals.upsertedCount).toBe(0);
  });

  it('preserves admin overrides during sync (protected fields not overwritten)', async () => {
    registryRepo.findByProviderAndModelKey.mockResolvedValue({
      id: 'r-existing',
      provider: 'OPENAI',
      modelKey: 'gpt-4o',
    } as never);
    registryManager.getProtectedFieldNames.mockResolvedValue(
      new Set<string>(['outputCostPer1M', 'qualityTier']),
    );

    globalThis.fetch = mock200([
      {
        provider: 'OPENAI',
        modelKey: 'gpt-4o',
        displayName: 'GPT-4o (upstream)',
        outputCostPer1M: 999,
        qualityTier: 'D',
      },
    ]) as unknown as typeof fetch;

    await manager.syncAll();
    const call = registryRepo.upsert.mock.calls[0];
    expect(call).toBeDefined();
    const updatePayload = call![3] as Record<string, unknown>;
    expect(updatePayload).not.toHaveProperty('outputCostPer1M');
    expect(updatePayload).not.toHaveProperty('qualityTier');
    expect(updatePayload.displayName).toBe('GPT-4o (upstream)');
  });
});
