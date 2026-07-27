import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { type ReactElement, type ReactNode } from 'react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useBillingInvoices } from '@/hooks/billing/use-billing-invoices';

const mockList = vi.fn();
const mockDownload = vi.fn();
const mockSave = vi.fn();

vi.mock('@/repositories/billing/billing.repository', () => ({
  billingRepository: {
    listInvoices: (...args: unknown[]) => mockList(...args),
    downloadInvoice: (...args: unknown[]) => mockDownload(...args),
  },
}));

vi.mock('@/utilities/file-download.utility', () => ({
  saveBlobDownload: (...args: unknown[]) => mockSave(...args),
}));

function makeWrapper(): (props: { children: ReactNode }) => ReactElement {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }): ReactElement {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useBillingInvoices', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue([]);
    mockDownload.mockResolvedValue(new Blob(['invoice'], { type: 'application/pdf' }));
  });

  it('saves an authenticated invoice response with the human invoice number', async () => {
    const { result } = renderHook(() => useBillingInvoices(), { wrapper: makeWrapper() });

    act(() => {
      result.current.download('invoice-1', 'CLAW-00000001');
    });

    await waitFor(() => {
      expect(mockSave).toHaveBeenCalledWith(expect.any(Blob), 'CLAW-00000001.pdf');
    });
    expect(mockDownload).toHaveBeenCalledWith('invoice-1');
  });

  it('surfaces a persistent row download failure', async () => {
    mockDownload.mockRejectedValue(new Error('unavailable'));
    const { result } = renderHook(() => useBillingInvoices(), { wrapper: makeWrapper() });

    act(() => {
      result.current.download('invoice-1', 'CLAW-00000001');
    });

    await waitFor(() => {
      expect(result.current.isDownloadError).toBe(true);
    });
  });
});
