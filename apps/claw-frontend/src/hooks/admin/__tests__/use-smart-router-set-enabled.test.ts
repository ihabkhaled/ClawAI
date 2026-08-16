import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useSmartRouterSetEnabled } from '@/hooks/admin/use-smart-router-set-enabled';

const mockSetEnabled = vi.fn();

vi.mock('@/repositories/admin/smart-router-admin.repository', () => ({
  smartRouterAdminRepository: { setEnabled: (...args: unknown[]) => mockSetEnabled(...args) },
}));

function makeWrapper(): (props: { children: ReactNode }) => ReactElement {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }): ReactElement {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useSmartRouterSetEnabled', () => {
  beforeEach(() => vi.clearAllMocks());

  it('toggles enabled for the global scope', async () => {
    mockSetEnabled.mockResolvedValue({ id: 'rev-1', enabled: false });
    const { result } = renderHook(() => useSmartRouterSetEnabled(), { wrapper: makeWrapper() });

    act(() => result.current.setEnabled(false));

    await waitFor(() => expect(mockSetEnabled).toHaveBeenCalledWith('GLOBAL', false));
  });
});
