import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAvailableModels } from '@/hooks/chat/use-available-models';
import type { ConnectorModel } from '@/types';

const mockUseAllModels = vi.fn();
const mockUseLocalModels = vi.fn();
const mockUseFrontierCatalog = vi.fn();

vi.mock('@/hooks/connectors/use-all-models', () => ({
  useAllModels: () => mockUseAllModels(),
}));

vi.mock('@/hooks/ollama/use-local-models', () => ({
  useLocalModels: () => mockUseLocalModels(),
}));

vi.mock('@/hooks/local-frontier/use-frontier-catalog', () => ({
  useFrontierCatalog: () => mockUseFrontierCatalog(),
}));

describe('useAvailableModels', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAllModels.mockReturnValue({
      models: [
        {
          provider: 'OLLAMA',
          modelKey: 'glm4:latest',
          displayName: 'glm4:latest',
        },
        {
          provider: 'OLLAMA',
          modelKey: 'glm-5.1:cloud',
          displayName: 'glm-5.1:cloud',
        },
        {
          provider: 'OPENAI',
          modelKey: 'gpt-4o',
          displayName: 'GPT-4o',
        },
      ] as unknown as ConnectorModel[],
      isLoading: false,
      isError: false,
      providerFilter: null,
      lifecycleFilter: '',
      setProviderFilter: vi.fn(),
      setLifecycleFilter: vi.fn(),
      totalModels: 3,
    });

    mockUseLocalModels.mockReturnValue({
      models: [
        {
          name: 'glm4',
          tag: 'latest',
          family: 'glm',
          isInstalled: true,
          roles: [],
          category: null,
        },
      ],
      isLoading: false,
    });

    mockUseFrontierCatalog.mockReturnValue({
      data: { data: [] },
      isLoading: false,
    });
  });

  it('keeps local Ollama models separate from Ollama connector models', () => {
    const { result } = renderHook(() => useAvailableModels());

    const localGroup = result.current.groupedModels.find(
      (group) => group.provider === 'local-ollama',
    );
    const ollamaGroup = result.current.groupedModels.find((group) => group.provider === 'OLLAMA');

    expect(localGroup?.models).toEqual([
      expect.objectContaining({
        provider: 'local-ollama',
        model: 'glm4',
      }),
    ]);
    expect(ollamaGroup?.models).toEqual([
      expect.objectContaining({
        provider: 'OLLAMA',
        model: 'glm-5.1:cloud',
      }),
    ]);
  });

  describe('local-llamacpp frontier integration', () => {
    it('includes only READY frontier entries under local-llamacpp group', () => {
      mockUseFrontierCatalog.mockReturnValue({
        data: {
          data: [
            {
              id: 'a',
              name: 'glm-5.1',
              tag: 'Q4_K_M',
              displayName: 'GLM-5.1',
              parameterCount: '754B',
              downloadStatus: 'READY',
            },
            {
              id: 'b',
              name: 'kimi-k2',
              tag: 'Q3_K_M',
              displayName: 'Kimi K2',
              parameterCount: '1T',
              downloadStatus: 'AVAILABLE',
            },
            {
              id: 'c',
              name: 'deepseek-v3.2',
              tag: 'Q4_K_M',
              displayName: 'DeepSeek V3.2',
              parameterCount: '671B',
              downloadStatus: 'PULLING',
            },
          ],
        },
        isLoading: false,
      });

      const { result } = renderHook(() => useAvailableModels());
      const frontierGroup = result.current.groupedModels.find(
        (g) => g.provider === 'local-llamacpp',
      );

      expect(frontierGroup).toBeDefined();
      expect(frontierGroup?.label).toBe('llama.cpp Frontier (Local)');
      expect(frontierGroup?.models).toHaveLength(1);
      expect(frontierGroup?.models[0]).toEqual(
        expect.objectContaining({
          provider: 'local-llamacpp',
          model: 'glm-5.1:Q4_K_M',
          displayName: 'GLM-5.1 (754B)',
        }),
      );
    });

    it('omits local-llamacpp group when no frontier entries are READY', () => {
      mockUseFrontierCatalog.mockReturnValue({
        data: {
          data: [
            {
              id: 'a',
              name: 'glm-5.1',
              tag: 'Q4_K_M',
              displayName: 'GLM-5.1',
              parameterCount: '754B',
              downloadStatus: 'AVAILABLE',
            },
          ],
        },
        isLoading: false,
      });

      const { result } = renderHook(() => useAvailableModels());
      expect(
        result.current.groupedModels.find((g) => g.provider === 'local-llamacpp'),
      ).toBeUndefined();
    });

    it('sorts local-ollama first, then local-llamacpp, then alphabetical cloud groups', () => {
      mockUseFrontierCatalog.mockReturnValue({
        data: {
          data: [
            {
              id: 'a',
              name: 'glm-5.1',
              tag: 'Q4_K_M',
              displayName: 'GLM-5.1',
              parameterCount: '754B',
              downloadStatus: 'READY',
            },
          ],
        },
        isLoading: false,
      });

      const { result } = renderHook(() => useAvailableModels());
      const order = result.current.groupedModels.map((g) => g.provider);

      const localOllamaIdx = order.indexOf('local-ollama');
      const localFrontierIdx = order.indexOf('local-llamacpp');
      const ollamaCloudIdx = order.indexOf('OLLAMA');

      expect(localOllamaIdx).toBeGreaterThanOrEqual(0);
      expect(localFrontierIdx).toBeGreaterThan(localOllamaIdx);
      expect(ollamaCloudIdx).toBeGreaterThan(localFrontierIdx);
    });

    it('reflects loading state from frontier query', () => {
      mockUseFrontierCatalog.mockReturnValue({ data: undefined, isLoading: true });
      const { result } = renderHook(() => useAvailableModels());
      expect(result.current.isLoading).toBe(true);
    });
  });
});
