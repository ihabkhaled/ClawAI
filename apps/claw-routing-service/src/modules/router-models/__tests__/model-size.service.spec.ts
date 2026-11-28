import { type Mocked, vi } from 'vitest';
import { RouterModelsService } from '../services/router-models.service';
import { type RouterModelRegistryManager } from '../managers/router-model-registry.manager';
import { type RouterModelRegistryRepository } from '../repositories/router-model-registry.repository';
import { mapPrismaToRecord } from '../utilities/router-model-record.utility';
import { type RouterModelSizeRow } from '../types/model-size.types';

const decimal = (value: number): { toNumber: () => number } => ({ toNumber: () => value });

const row = (overrides: Partial<RouterModelSizeRow> = {}): RouterModelSizeRow => ({
  provider: 'OPENROUTER',
  modelKey: 'openai/gpt-oss-120b',
  contextWindowTokens: null,
  maxContextTokens: null,
  parameterCountBillions: null,
  activeParameterCountBillions: null,
  ...overrides,
});

describe('RouterModelsService.listModelSizes', () => {
  let service: RouterModelsService;
  let registryRepo: Mocked<RouterModelRegistryRepository>;

  beforeEach(() => {
    registryRepo = {
      listSizeRows: vi.fn(),
    } as unknown as Mocked<RouterModelRegistryRepository>;
    service = new RouterModelsService(registryRepo, {} as unknown as RouterModelRegistryManager);
  });

  it('returns the stored counts as plain numbers', async () => {
    registryRepo.listSizeRows.mockResolvedValue([
      row({
        contextWindowTokens: 131_072,
        parameterCountBillions: decimal(117),
        activeParameterCountBillions: decimal(5.1),
      }),
    ]);

    await expect(service.listModelSizes()).resolves.toEqual({
      data: [
        {
          provider: 'OPENROUTER',
          modelKey: 'openai/gpt-oss-120b',
          contextWindowTokens: 131_072,
          parameterCountBillions: 117,
          activeParameterCountBillions: 5.1,
        },
      ],
    });
  });

  it('leaves a closed model without a parameter count', async () => {
    registryRepo.listSizeRows.mockResolvedValue([
      row({ provider: 'OPENAI', modelKey: 'gpt-5.4', contextWindowTokens: 400_000 }),
    ]);

    const { data } = await service.listModelSizes();

    expect(data[0]).toMatchObject({
      contextWindowTokens: 400_000,
      parameterCountBillions: null,
      activeParameterCountBillions: null,
    });
  });

  it('prefers the enrichment window, then the sync window, then the published family window', async () => {
    registryRepo.listSizeRows.mockResolvedValue([
      row({ modelKey: 'a', maxContextTokens: 1_000_000, contextWindowTokens: 8_192 }),
      row({ modelKey: 'b', maxContextTokens: null, contextWindowTokens: 8_192 }),
      row({ provider: 'GEMINI', modelKey: 'models/gemini-3.6-flash' }),
      row({ provider: 'OPENAI', modelKey: 'a-model-nobody-published-a-window-for' }),
    ]);

    const { data } = await service.listModelSizes();

    expect(data.map((entry) => entry.contextWindowTokens)).toEqual([
      1_000_000,
      8_192,
      1_048_576,
      null,
    ]);
  });

  it('returns an empty list for an empty registry', async () => {
    registryRepo.listSizeRows.mockResolvedValue([]);

    await expect(service.listModelSizes()).resolves.toEqual({ data: [] });
  });
});

describe('mapPrismaToRecord parameter counts', () => {
  it('maps a Decimal column to a number and null to null', () => {
    const base = {
      id: 'r1',
      provider: 'OLLAMA',
      modelKey: 'qwen3:8b',
      inputCostPer1M: null,
      outputCostPer1M: null,
      hallucinationRisk: null,
      adminOverrideJson: null,
    };
    const withCount = mapPrismaToRecord({
      ...base,
      parameterCountBillions: decimal(8.2),
      activeParameterCountBillions: null,
    } as never);
    expect(withCount.parameterCountBillions).toBe(8.2);
    expect(withCount.activeParameterCountBillions).toBeNull();
  });
});
