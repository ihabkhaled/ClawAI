import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import {
  DownloadStatus,
  type ModelCatalogEntry,
  ModelCategory,
  RuntimeType,
} from '../../../../generated/prisma';
import { CatalogRemoteMetadataService } from '../catalog-remote-metadata.service';

const getMock = jest.fn<(url: string, config?: unknown) => Promise<unknown>>();

jest.mock('@common/utilities', () => ({
  createHttpClient: () => ({
    get: getMock,
  }),
}));

function createCatalogEntry(overrides: Partial<ModelCatalogEntry> = {}): ModelCatalogEntry {
  return {
    id: 'catalog-1',
    name: 'qwen3',
    tag: 'latest',
    displayName: 'Qwen 3',
    category: ModelCategory.GENERAL,
    description: 'Qwen model',
    sizeBytes: null,
    parameterCount: '8B',
    quantization: null,
    runtime: RuntimeType.OLLAMA,
    ollamaName: 'qwen3:latest',
    sourceUrl: 'https://registry.ollama.com/library/qwen3',
    isRecommended: false,
    capabilities: [],
    businessCategories: [],
    hardwareProfiles: [],
    isDiscovered: false,
    discoverySourceId: null,
    downloadStatus: DownloadStatus.UNKNOWN,
    lastVerifiedAt: null,
    searchBrowserScore: null,
    searchBrowserScoreAt: null,
    searchBrowserReasons: [],
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

describe('CatalogRemoteMetadataService', () => {
  beforeEach(() => {
    getMock.mockReset();
  });

  it('fetches size from the Ollama registry manifest', async () => {
    getMock.mockResolvedValue({
      data: {
        layers: [{ size: 100 }, { size: 25 }],
      },
    });
    const service = new CatalogRemoteMetadataService();

    const metadata = await service.getMetadata(createCatalogEntry());

    expect(getMock).toHaveBeenCalledWith('/v2/library/qwen3/manifests/latest');
    expect(metadata.sizeBytes).toBe(BigInt(125));
    expect(metadata.isDownloadable).toBe(true);
  });

  it('tries generic slug candidates before marking a model unavailable', async () => {
    getMock.mockRejectedValueOnce(new Error('manifest unknown')).mockResolvedValueOnce({
      data: {
        layers: [{ size: 50 }],
      },
    });
    const service = new CatalogRemoteMetadataService();

    const metadata = await service.getMetadata(
      createCatalogEntry({
        name: 'glm5.1',
        ollamaName: 'glm5.1:latest',
        sourceUrl: 'https://registry.ollama.com/library/glm5.1',
      }),
    );

    expect(getMock).toHaveBeenNthCalledWith(1, '/v2/library/glm5.1/manifests/latest');
    expect(getMock).toHaveBeenNthCalledWith(2, '/v2/library/glm-5.1/manifests/latest');
    expect(metadata.sourceUrl).toBe('https://registry.ollama.com/library/glm-5.1');
    expect(metadata.resolvedOllamaName).toBe('glm-5.1:latest');
  });

  it('keeps fallback source urls pinned to the requested model instead of unrelated search hits', async () => {
    getMock
      .mockRejectedValueOnce(new Error('manifest unknown'))
      .mockRejectedValueOnce(new Error('manifest unknown'))
      .mockResolvedValueOnce({
        data: '<a href="/library/qwen3.5">Qwen 3.5</a><a href="/library/qwen3">Qwen 3</a>',
      })
      .mockRejectedValueOnce(new Error('manifest unknown'))
      .mockRejectedValueOnce(new Error('manifest unknown'))
      .mockRejectedValueOnce(new Error('manifest unknown'));
    const service = new CatalogRemoteMetadataService();

    const metadata = await service.getMetadata(
      createCatalogEntry({
        ollamaName: 'qwen3:7b',
        sourceUrl: 'https://registry.ollama.com/library/qwen3.5',
      }),
    );

    expect(getMock).toHaveBeenNthCalledWith(4, '/v2/library/qwen3/manifests/7b');
    expect(metadata.sourceUrl).toBe('https://registry.ollama.com/library/qwen3');
    expect(metadata.isDownloadable).toBe(false);
  });

  it('marks missing manifests as unavailable', async () => {
    getMock.mockRejectedValue(new Error('manifest unknown'));
    const service = new CatalogRemoteMetadataService();

    const metadata = await service.getMetadata(createCatalogEntry());

    expect(metadata.isAvailable).toBe(false);
    expect(metadata.isDownloadable).toBe(false);
    expect(metadata.sizeBytes).toBeNull();
  });
});
