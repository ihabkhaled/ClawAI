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
});
