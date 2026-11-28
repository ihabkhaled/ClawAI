import { type Mock, type Mocked, vi } from 'vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import { RouterModelRegistryManager } from '../../router-models/managers/router-model-registry.manager';
import { RouterModelRegistryRepository } from '../../router-models/repositories/router-model-registry.repository';
import { ModelCostCatalogService } from '../../router-models/services/model-cost-catalog.service';
import { ModelCostService } from '../../router-models/services/model-cost.service';
import { RouterSyncManager } from '../managers/router-sync.manager';
import { parameterCountColumns } from '../utilities/upsert-input-builder.utility';

vi.mock('../../../common/utilities/inter-service-auth.utility', () => ({
  buildInterServiceAuthHeader: (): string => 'Service router-sync-spec-token',
}));

const originalFetch = globalThis.fetch;

function mock200(models: unknown[]): Mock {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ models }),
  });
}

describe('parameterCountColumns', () => {
  it('uses the local runtime report first', () => {
    expect(
      parameterCountColumns({
        provider: 'OLLAMA',
        modelKey: 'deepseek-r1:671b',
        displayName: 'x',
        parameterCount: '671B (37B active)',
      }),
    ).toEqual({ parameterCountBillions: 671, activeParameterCountBillions: 37 });
  });

  it('falls back to a maker-published count for a cloud model', () => {
    expect(
      parameterCountColumns({
        provider: 'OPENROUTER',
        modelKey: 'openai/gpt-oss-120b',
        displayName: 'x',
      }),
    ).toEqual({ parameterCountBillions: 117, activeParameterCountBillions: 5.1 });
  });

  it('returns nothing for a closed model, so an update never writes NULL over a count', () => {
    expect(
      parameterCountColumns({ provider: 'OPENAI', modelKey: 'gpt-5.4', displayName: 'GPT 5.4' }),
    ).toEqual({});
  });
});

describe('RouterSyncManager parameter counts', () => {
  let manager: RouterSyncManager;
  let registryRepo: Mocked<RouterModelRegistryRepository>;
  let registryManager: Mocked<RouterModelRegistryManager>;

  beforeEach(async () => {
    registryRepo = {
      findByProviderAndModelKey: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockResolvedValue({ id: 'r1' }),
    } as unknown as Mocked<RouterModelRegistryRepository>;
    registryManager = {
      getProtectedFieldNames: vi.fn().mockResolvedValue(new Set<string>()),
    } as unknown as Mocked<RouterModelRegistryManager>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RouterSyncManager,
        { provide: RouterModelRegistryRepository, useValue: registryRepo },
        { provide: RouterModelRegistryManager, useValue: registryManager },
        { provide: ModelCostService, useValue: { applyPublishedPrices: vi.fn() } },
        {
          provide: ModelCostCatalogService,
          useValue: { auditCoverage: vi.fn().mockResolvedValue({ unpriced: 0, fallback: 0 }) },
        },
        { provide: RabbitMQService, useValue: { publish: vi.fn(() => Promise.resolve()) } },
      ],
    }).compile();
    manager = module.get<RouterSyncManager>(RouterSyncManager);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('writes a runtime-reported count on create and on update', async () => {
    globalThis.fetch = mock200([
      {
        provider: 'OLLAMA',
        modelKey: 'qwen3:8b',
        displayName: 'qwen3:8b',
        isLocal: true,
        parameterCount: '8.2B',
      },
    ]) as unknown as typeof fetch;

    await manager.syncAll();

    const call = registryRepo.upsert.mock.calls[0];
    expect(call?.[2]).toMatchObject({
      parameterCountBillions: 8.2,
      activeParameterCountBillions: null,
    });
    expect(call?.[3]).toMatchObject({
      parameterCountBillions: 8.2,
      activeParameterCountBillions: null,
    });
  });

  it('never writes a size onto a closed model', async () => {
    globalThis.fetch = mock200([
      { provider: 'OPENAI', modelKey: 'gpt-5.4', displayName: 'GPT 5.4' },
    ]) as unknown as typeof fetch;

    await manager.syncAll();

    const call = registryRepo.upsert.mock.calls[0];
    expect(call?.[2]).not.toHaveProperty('parameterCountBillions');
    expect(call?.[3]).not.toHaveProperty('parameterCountBillions');
  });

  it('leaves a count an admin pinned alone', async () => {
    registryRepo.findByProviderAndModelKey.mockResolvedValue({
      id: 'r-existing',
      adminOverrideJson: null,
    } as never);
    registryManager.getProtectedFieldNames.mockResolvedValue(
      new Set<string>(['parameterCountBillions']),
    );
    globalThis.fetch = mock200([
      { provider: 'OPENROUTER', modelKey: 'openai/gpt-oss-120b', displayName: 'gpt-oss-120b' },
    ]) as unknown as typeof fetch;

    await manager.syncAll();

    const update = registryRepo.upsert.mock.calls[0]?.[3] as Record<string, unknown>;
    expect(update).not.toHaveProperty('parameterCountBillions');
    // Pinning the total pins the whole size: no table share beside an admin's total.
    expect(update).not.toHaveProperty('activeParameterCountBillions');
  });
});
