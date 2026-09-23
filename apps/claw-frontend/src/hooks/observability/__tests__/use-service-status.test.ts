import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ComponentState } from '@/enums';
import { useServiceStatus } from '@/hooks/observability/use-service-status';

const mockGetStatusPage = vi.fn();

vi.mock('@/repositories/health/health.repository', () => ({
  healthRepository: {
    getStatusPage: (...args: unknown[]) => mockGetStatusPage(...args),
  },
}));

function makeWrapper(): (props: { children: ReactNode }) => ReactElement {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }): ReactElement {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

const response = {
  generatedAt: '2026-09-23T12:00:00.000Z',
  overall: ComponentState.UP,
  components: [],
  incidents: [],
  historyAvailable: true,
  bucketSeconds: 300,
};

describe('useServiceStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the status page once it loads', async () => {
    mockGetStatusPage.mockResolvedValue(response);

    const { result } = renderHook(() => useServiceStatus(), { wrapper: makeWrapper() });

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => {
      expect(result.current.status).toEqual(response);
    });
    expect(result.current.isError).toBe(false);
    expect(mockGetStatusPage).toHaveBeenCalledOnce();
  });

  it('reports an error without inventing a status', async () => {
    mockGetStatusPage.mockRejectedValue(new Error('403'));

    const { result } = renderHook(() => useServiceStatus(), { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(result.current.status).toBeUndefined();
  });
});
