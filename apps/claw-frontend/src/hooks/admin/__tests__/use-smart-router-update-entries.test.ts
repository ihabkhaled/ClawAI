import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  RouterChainEntryRole,
  RouterConfigurationBillingModel,
  RouterProvider,
} from '@/enums/router-configuration.enum';
import { useSmartRouterUpdateEntries } from '@/hooks/admin/use-smart-router-update-entries';
import type { ChainEntryInput } from '@/types/smart-router-admin.types';

const mockUpdateEntries = vi.fn();

vi.mock('@/repositories/admin/smart-router-admin.repository', () => ({
  smartRouterAdminRepository: {
    updateEntries: (...args: unknown[]) => mockUpdateEntries(...args),
  },
}));

function makeWrapper(): (props: { children: ReactNode }) => ReactElement {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }): ReactElement {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useSmartRouterUpdateEntries', () => {
  beforeEach(() => vi.clearAllMocks());

  it('PATCHes the full entries array for the given id', async () => {
    mockUpdateEntries.mockResolvedValue({ id: 'rev-1', entries: [] });
    const { result } = renderHook(() => useSmartRouterUpdateEntries(), { wrapper: makeWrapper() });

    const entries: ChainEntryInput[] = [
      {
        role: RouterChainEntryRole.PRIMARY,
        provider: RouterProvider.ANTHROPIC,
        modelAlias: 'claude-sonnet-4-5',
        enabled: true,
        attemptTimeoutMs: 1600,
        retries: 0,
        triggers: [],
        skipWhenProviderCircuitOpen: true,
        billingModel: RouterConfigurationBillingModel.UNKNOWN,
      },
    ];
    act(() => result.current.updateEntries('rev-1', entries));

    await waitFor(() => expect(mockUpdateEntries).toHaveBeenCalledWith('rev-1', { entries }));
  });
});
