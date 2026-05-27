import { Test, type TestingModule } from '@nestjs/testing';
import { RabbitMQService } from '@claw/shared-rabbitmq';
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

function mockUnreachable(): jest.Mock {
  return jest.fn().mockRejectedValue(new Error('connect ECONNREFUSED'));
}

describe('RouterSyncManager — Phase 3 intelligence enrichment', () => {
  let manager: RouterSyncManager;
  let registryRepo: jest.Mocked<RouterModelRegistryRepository>;
  let registryManager: jest.Mocked<RouterModelRegistryManager>;
  let rabbitMQ: jest.Mocked<RabbitMQService>;

  beforeEach(async () => {
    registryRepo = {
      findByProviderAndModelKey: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockResolvedValue({ id: 'r1' }),
    } as unknown as jest.Mocked<RouterModelRegistryRepository>;
    registryManager = {
      getProtectedFieldNames: jest.fn().mockResolvedValue(new Set<string>()),
    } as unknown as jest.Mocked<RouterModelRegistryManager>;
    rabbitMQ = {
      publish: jest.fn(() => Promise.resolve()),
    } as unknown as jest.Mocked<RabbitMQService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RouterSyncManager,
        { provide: RouterModelRegistryRepository, useValue: registryRepo },
        { provide: RouterModelRegistryManager, useValue: registryManager },
        { provide: RabbitMQService, useValue: rabbitMQ },
      ],
    }).compile();
    manager = module.get<RouterSyncManager>(RouterSyncManager);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('enriches a known cloud model from the curated table', async () => {
    globalThis.fetch = mock200([
      { provider: 'OPENAI', modelKey: 'gpt-4o', displayName: 'GPT-4o' },
    ]) as unknown as typeof fetch;

    await manager.syncAll();
    const lastCreateCall = registryRepo.upsert.mock.calls.find(
      (c) => (c[0] as string) === 'OPENAI',
    );
    expect(lastCreateCall).toBeDefined();
    const createInput = lastCreateCall![2] as Record<string, unknown>;
    expect(createInput.supportsVision).toBe(true);
    expect(createInput.supportsTools).toBe(true);
    expect(createInput.qualityTierLabel).toBe('PRO');
    expect(createInput.privacyClassLabel).toBe('cloud');
  });

  it('enriches a local model from the family heuristic', async () => {
    globalThis.fetch = mock200([
      {
        provider: 'OLLAMA',
        modelKey: 'qwen3-coder:32b',
        displayName: 'Qwen3 Coder 32B',
        family: 'qwen3-coder',
        isLocal: true,
      },
    ]) as unknown as typeof fetch;

    await manager.syncAll();
    const call = registryRepo.upsert.mock.calls.find(
      (c) => (c[0] as string) === 'OLLAMA' && (c[1] as string) === 'qwen3-coder:32b',
    );
    expect(call).toBeDefined();
    const createInput = call![2] as Record<string, unknown>;
    expect(createInput.domainStrengths).toContain('coding');
    expect(createInput.privacyClassLabel).toBe('local');
    expect(createInput.costClassLabel).toBe('FREE');
  });

  it('leaves unknown-family local model enrichment as the empty set (capabilities stay null)', async () => {
    globalThis.fetch = mock200([
      {
        provider: 'OLLAMA',
        modelKey: 'totally-novel-model:7b',
        displayName: 'Totally Novel Model',
        family: 'novel-experiment',
        isLocal: true,
      },
    ]) as unknown as typeof fetch;

    await manager.syncAll();
    const call = registryRepo.upsert.mock.calls.find(
      (c) =>
        (c[0] as string) === 'OLLAMA' && (c[1] as string) === 'totally-novel-model:7b',
    );
    expect(call).toBeDefined();
    const createInput = call![2] as Record<string, unknown>;
    // No enrichment found → no capability keys written → row defaults
    // (FALSE per schema) take effect for capability flags; planner reads
    // these as "known FALSE" only because no source contradicted. Critical:
    // we do NOT silently fabricate `true` capabilities.
    expect(createInput.supportsVision).toBeUndefined();
    expect(createInput.supportsTools).toBeUndefined();
    expect(createInput.qualityTierLabel).toBeUndefined();
  });

  it('PRESERVES adminOverrideJson keys on every sync pass', async () => {
    registryRepo.findByProviderAndModelKey.mockResolvedValue({
      id: 'r-existing',
      provider: 'OPENAI',
      modelKey: 'gpt-4o',
      adminOverrideJson: { qualityTierLabel: 'FRONTIER', supportsTools: false },
    } as never);

    globalThis.fetch = mock200([
      { provider: 'OPENAI', modelKey: 'gpt-4o', displayName: 'GPT-4o (upstream)' },
    ]) as unknown as typeof fetch;

    await manager.syncAll();
    const call = registryRepo.upsert.mock.calls.find(
      (c) => (c[0] as string) === 'OPENAI' && (c[1] as string) === 'gpt-4o',
    );
    expect(call).toBeDefined();
    const updateInput = call![3] as Record<string, unknown>;
    // Curated says qualityTierLabel=PRO and supportsTools=true. Both keys
    // are pinned, so sync MUST skip them.
    expect(updateInput.qualityTierLabel).toBeUndefined();
    expect(updateInput.supportsTools).toBeUndefined();
    // Non-pinned fields still flow through.
    expect(updateInput.supportsVision).toBe(true);
  });

  it('uses snapshot.intelligence when present (overrides curated table)', async () => {
    globalThis.fetch = mock200([
      {
        provider: 'OPENAI',
        modelKey: 'gpt-4o',
        displayName: 'GPT-4o',
        intelligence: {
          qualityTierLabel: 'FRONTIER',
          supportsVision: false,
        },
      },
    ]) as unknown as typeof fetch;

    await manager.syncAll();
    const call = registryRepo.upsert.mock.calls.find(
      (c) => (c[0] as string) === 'OPENAI' && (c[1] as string) === 'gpt-4o',
    );
    expect(call).toBeDefined();
    const createInput = call![2] as Record<string, unknown>;
    expect(createInput.qualityTierLabel).toBe('FRONTIER');
    expect(createInput.supportsVision).toBe(false);
  });

  it('marks lastEnrichedAt when any enrichment is applied', async () => {
    globalThis.fetch = mock200([
      { provider: 'OPENAI', modelKey: 'gpt-4o', displayName: 'GPT-4o' },
    ]) as unknown as typeof fetch;

    await manager.syncAll();
    const call = registryRepo.upsert.mock.calls.find(
      (c) => (c[0] as string) === 'OPENAI' && (c[1] as string) === 'gpt-4o',
    );
    const updateInput = call![3] as Record<string, unknown>;
    expect(updateInput.lastEnrichedAt).toBeInstanceOf(Date);
  });

  it('skips upstream gracefully when service URL is unreachable', async () => {
    globalThis.fetch = mockUnreachable() as unknown as typeof fetch;

    const result = await manager.syncAll();
    for (const p of result.perProvider) {
      expect(['UPSTREAM_ERROR', 'UPSTREAM_404']).toContain(p.status);
    }
    expect(result.totals.upsertedCount).toBe(0);
    expect(registryRepo.upsert).not.toHaveBeenCalled();
  });

  it('explicit adminOverrideJson takes precedence over curated when sync has no enrichment from sources', async () => {
    registryRepo.findByProviderAndModelKey.mockResolvedValue({
      id: 'r-existing',
      provider: 'OPENAI',
      modelKey: 'gpt-4o',
      adminOverrideJson: { qualityTierLabel: 'FRONTIER' },
    } as never);

    globalThis.fetch = mock200([
      {
        provider: 'OPENAI',
        modelKey: 'gpt-4o',
        displayName: 'GPT-4o',
        // No intelligence; curated says PRO; override says FRONTIER.
      },
    ]) as unknown as typeof fetch;

    await manager.syncAll();
    const call = registryRepo.upsert.mock.calls.find(
      (c) => (c[0] as string) === 'OPENAI' && (c[1] as string) === 'gpt-4o',
    );
    const updateInput = call![3] as Record<string, unknown>;
    // qualityTierLabel is pinned → sync MUST NOT touch it.
    expect(updateInput.qualityTierLabel).toBeUndefined();
  });
});
