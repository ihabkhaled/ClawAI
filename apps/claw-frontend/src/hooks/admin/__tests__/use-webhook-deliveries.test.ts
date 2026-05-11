import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useWebhookDeliveriesPage } from '@/hooks/admin/use-webhook-deliveries';

const mockListWebhookDeliveries = vi.fn();
const mockReplayWebhookDelivery = vi.fn();
const mockShowToastSuccess = vi.fn();
const mockShowToastApiError = vi.fn();

vi.mock('@/repositories/admin/webhook-deliveries.repository', () => ({
  listWebhookDeliveries: (...args: unknown[]) => mockListWebhookDeliveries(...args),
  replayWebhookDelivery: (...args: unknown[]) => mockReplayWebhookDelivery(...args),
}));

vi.mock('@/utilities', async (importOriginal) => {
  const mod = await importOriginal<Record<string, unknown>>();
  return {
    ...mod,
    showToast: {
      success: (...args: unknown[]) => mockShowToastSuccess(...args),
      apiError: (...args: unknown[]) => mockShowToastApiError(...args),
      error: vi.fn(),
      info: vi.fn(),
      warning: vi.fn(),
    },
  };
});

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    locale: 'en',
    dir: 'ltr',
  }),
}));

function makeWrapper(): (props: { children: ReactNode }) => ReactElement {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }): ReactElement {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

const sampleDelivery = {
  id: 'd1',
  provider: 'GITHUB',
  connectorId: 'qa-github-test',
  externalDeliveryId: null,
  eventType: null,
  signatureValid: false,
  signature: null,
  errorMessage: 'SIGNATURE_INVALID',
  ipAddress: '172.18.0.1',
  bodyBytes: 10,
  createdAt: '2026-05-09T08:57:57.838Z',
  processedAt: null,
};

describe('useWebhookDeliveriesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns deliveries from query', async () => {
    mockListWebhookDeliveries.mockResolvedValue([sampleDelivery]);
    const { result } = renderHook(() => useWebhookDeliveriesPage(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.deliveries).toHaveLength(1));
  });

  it('surfaces query errors', async () => {
    mockListWebhookDeliveries.mockRejectedValue(new Error('list-failed'));
    const { result } = renderHook(() => useWebhookDeliveriesPage(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('list-failed');
  });

  it('replay success fires toast and clears replayingId', async () => {
    mockListWebhookDeliveries.mockResolvedValue([sampleDelivery]);
    mockReplayWebhookDelivery.mockResolvedValue({ deliveryId: 'd1' });
    const { result } = renderHook(() => useWebhookDeliveriesPage(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.deliveries).toHaveLength(1));

    act(() => {
      result.current.onReplay('d1');
    });

    await waitFor(() => expect(mockShowToastSuccess).toHaveBeenCalled());
    expect(mockReplayWebhookDelivery).toHaveBeenCalledWith('d1');
    expect(result.current.replayingId).toBeNull();
  });

  it('replay error sets mutationError + apiError toast', async () => {
    mockListWebhookDeliveries.mockResolvedValue([sampleDelivery]);
    mockReplayWebhookDelivery.mockRejectedValue(new Error('replay-failed'));
    const { result } = renderHook(() => useWebhookDeliveriesPage(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.deliveries).toHaveLength(1));

    act(() => {
      result.current.onReplay('d1');
    });

    await waitFor(() => expect(result.current.mutationError?.message).toBe('replay-failed'));
    expect(mockShowToastApiError).toHaveBeenCalled();
    expect(result.current.replayingId).toBeNull();
  });

  it('clearMutationError resets state', async () => {
    mockListWebhookDeliveries.mockResolvedValue([]);
    mockReplayWebhookDelivery.mockRejectedValue(new Error('x'));
    const { result } = renderHook(() => useWebhookDeliveriesPage(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.onReplay('d1');
    });
    await waitFor(() => expect(result.current.mutationError).not.toBeNull());

    act(() => {
      result.current.clearMutationError();
    });
    expect(result.current.mutationError).toBeNull();
  });

  it('setFilter updates filter state', async () => {
    mockListWebhookDeliveries.mockResolvedValue([]);
    const { result } = renderHook(() => useWebhookDeliveriesPage(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.setFilter({ provider: 'GITHUB', signatureValid: true });
    });

    expect(result.current.filter).toEqual({ provider: 'GITHUB', signatureValid: true });
  });
});
