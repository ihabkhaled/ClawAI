import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useSmartRouterSelectableDeployments } from '@/hooks/admin/use-smart-router-selectable-deployments';

const mockList = vi.fn();

vi.mock('@/repositories/admin/smart-router-admin.repository', () => ({
  smartRouterAdminRepository: { listSelectableDeployments: () => mockList() },
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    locale: 'en',
    t: (key: string, params?: Record<string, string>) => `${key}=${params?.['value'] ?? ''}`,
  }),
}));

vi.mock('@/hooks/chat/use-model-sizes', () => ({
  useModelSizes: () => ({
    isLoading: false,
    lookup: (provider: string, ...keys: string[]) =>
      provider === 'OLLAMA_CLOUD' && keys.includes('gpt-oss:120b-cloud')
        ? {
            contextWindowTokens: 131_072,
            parameterCountBillions: 117,
            activeParameterCountBillions: null,
          }
        : undefined,
  }),
}));

function wrapper({ children }: { children: ReactNode }): ReactElement {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client }, children);
}

describe('useSmartRouterSelectableDeployments size', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('writes the size beside a model a chain entry may name, and none beside an unknown one', async () => {
    mockList.mockResolvedValue([
      {
        id: 'd1',
        provider: 'OLLAMA_CLOUD',
        providerModelId: 'gpt-oss:120b-cloud',
        isValidated: true,
      },
      { id: 'd2', provider: 'ANTHROPIC', providerModelId: 'claude-sonnet-5', isValidated: true },
    ]);

    const { result } = renderHook(() => useSmartRouterSelectableDeployments(), { wrapper });

    await waitFor(() => {
      expect(result.current.deployments).toHaveLength(2);
    });
    expect(result.current.deployments[0]?.scale?.label).toBe(
      'modelScale.context=128K · modelScale.parameters=117B',
    );
    expect(result.current.deployments[1]?.scale).toBeUndefined();
  });
});
