import { DownloadStatus, LoadStatus, ModelCategory, QualityTier } from '../../../../common/enums';
import { type CatalogRepository } from '../../repositories/catalog.repository';
import { type CatalogEntry } from '../../types/catalog.types';
import { RoutingSnapshotManager } from '../routing-snapshot.manager';

function makeEntry(overrides: Partial<CatalogEntry> = {}): CatalogEntry {
  return {
    id: 'cuid-1',
    name: 'kimi-k2',
    tag: '6-mini',
    displayName: 'Kimi K2.6 mini',
    category: ModelCategory.GENERAL,
    description: 'A frontier open-weight model.',
    parameterCount: '8B',
    totalParamsB: 8,
    activeParamsB: 8,
    contextLength: 128_000,
    capabilities: ['chat'],
    license: 'apache-2.0',
    huggingfaceRepo: 'moonshotai/Kimi-K2.6-mini-GGUF',
    filePattern: '*.Q4_K_M.gguf',
    manifestSha256: null,
    fileSizeBytes: BigInt(5_000_000_000),
    requiredRamGb: 16,
    recommendedRamGb: 24,
    requiredDiskGb: 6,
    recommendedGpuVramGb: 0,
    isRecommended: true,
    qualityTier: QualityTier.BALANCED,
    sourceUrl: 'https://huggingface.co/moonshotai/Kimi-K2.6-mini-GGUF',
    chatTemplate: null,
    available: true,
    downloadStatus: DownloadStatus.READY,
    loadStatus: LoadStatus.UNLOADED,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

describe('RoutingSnapshotManager (llamacpp)', () => {
  function buildManager(rows: CatalogEntry[]): RoutingSnapshotManager {
    const repo = {
      findAllReadyForRouting: jest.fn().mockResolvedValue(rows),
    };
    return new RoutingSnapshotManager(repo as unknown as CatalogRepository);
  }

  it('returns empty list when no READY entries exist', async () => {
    const result = await buildManager([]).build();
    expect(result.models).toEqual([]);
    expect(typeof result.generatedAt).toBe('string');
  });

  it('joins name and tag into modelKey', async () => {
    const result = await buildManager([makeEntry({ name: 'glm-5.1', tag: '32b' })]).build();
    expect(result.models[0]!.modelKey).toBe('glm-5.1:32b');
  });

  it('uses displayName from the catalog row', async () => {
    const result = await buildManager([makeEntry({ displayName: 'Kimi K2.6 mini' })]).build();
    expect(result.models[0]!.displayName).toBe('Kimi K2.6 mini');
  });

  it('always sets provider=LLAMACPP, isLocal=true, modalities=[TEXT]', async () => {
    const result = await buildManager([makeEntry()]).build();
    expect(result.models[0]!.provider).toBe('LLAMACPP');
    expect(result.models[0]!.isLocal).toBe(true);
    expect(result.models[0]!.modalitiesIn).toEqual(['TEXT']);
    expect(result.models[0]!.modalitiesOut).toEqual(['TEXT']);
  });

  it('propagates contextLength', async () => {
    const result = await buildManager([makeEntry({ contextLength: 256_000 })]).build();
    expect(result.models[0]!.contextWindowTokens).toBe(256_000);
  });
});
