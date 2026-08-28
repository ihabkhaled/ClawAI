import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import type { ReactElement, ReactNode } from 'react';
import { describe, expect, it, beforeEach, vi } from 'vitest';

import { ConnectorStatus } from '@/enums';
import { connectorRepository } from '@/repositories/connectors/connector.repository';
import { showToast } from '@/utilities';

import { useTestConnector } from '../use-test-connector';

vi.mock('@/repositories/connectors/connector.repository');
vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@/utilities', () => ({
  showToast: { success: vi.fn(), error: vi.fn(), apiError: vi.fn() },
  logger: { info: vi.fn(), error: vi.fn() },
}));

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }): ReactElement {
    return React.createElement(QueryClientProvider, { client }, children);
  };
}

describe('useTestConnector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reports success when the probe comes back HEALTHY', async () => {
    vi.mocked(connectorRepository.testConnector).mockResolvedValue({
      status: ConnectorStatus.HEALTHY,
      latencyMs: 271,
    });
    const { result } = renderHook(() => useTestConnector(), { wrapper: createWrapper() });

    act(() => {
      result.current.testConnector('connector-1');
    });

    await waitFor(() => {
      expect(showToast.success).toHaveBeenCalledWith({ title: 'connectors.testSuccessful' });
    });
    expect(showToast.error).not.toHaveBeenCalled();
  });

  // The probe answers HTTP 200 whatever the provider said, carrying the verdict
  // in `status`. Reading the 200 as the verdict told the operator the connector
  // worked while the backend had just marked it DOWN, and the real failure only
  // surfaced later as a 500 on Sync Models.
  it('reports failure, with the provider reason, when the probe comes back DOWN', async () => {
    vi.mocked(connectorRepository.testConnector).mockResolvedValue({
      status: ConnectorStatus.DOWN,
      latencyMs: 88,
      errorMessage: 'Anthropic API returned status 400',
    });
    const { result } = renderHook(() => useTestConnector(), { wrapper: createWrapper() });

    act(() => {
      result.current.testConnector('connector-1');
    });

    await waitFor(() => {
      expect(showToast.error).toHaveBeenCalledWith({
        title: 'connectors.testFailed',
        description: 'Anthropic API returned status 400',
      });
    });
    expect(showToast.success).not.toHaveBeenCalled();
  });

  it('reports failure when the request itself throws', async () => {
    vi.mocked(connectorRepository.testConnector).mockRejectedValue(new Error('network down'));
    const { result } = renderHook(() => useTestConnector(), { wrapper: createWrapper() });

    act(() => {
      result.current.testConnector('connector-1');
    });

    await waitFor(() => {
      expect(showToast.apiError).toHaveBeenCalled();
    });
    expect(showToast.success).not.toHaveBeenCalled();
  });
});
