import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren, ReactElement } from 'react';
import { createElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useBestOfNPage } from '@/hooks/chat/use-best-of-n-page';
import type { BestOfNRequest } from '@/types';
import type * as UtilitiesModule from '@/utilities';

const sendMock = vi.fn();

vi.mock('@/repositories/chat/chat.repository', () => ({
  chatRepository: {
    bestOfNMessage: (data: BestOfNRequest) => sendMock(data),
  },
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock('@/hooks/chat/use-best-of-n-poll', () => ({
  useBestOfNPoll: () => ({
    bestOfNResult: null,
    isPolling: false,
    isBestOfNReady: false,
    isBestOfNError: false,
    handleViewInThread: () => undefined,
  }),
}));

vi.mock('@/hooks/chat/use-best-of-n-stream', () => ({
  useBestOfNStream: () => ({ stages: [], hasProgress: false, streamError: null }),
}));

vi.mock('@/utilities', async (importOriginal) => ({
  ...(await importOriginal<typeof UtilitiesModule>()),
  logger: { info: vi.fn(), error: vi.fn() },
  showToast: { apiError: vi.fn(), error: vi.fn(), success: vi.fn() },
}));

const wrapper = ({ children }: PropsWithChildren): ReactElement => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return createElement(QueryClientProvider, { client }, children);
};

const MODEL = { provider: 'ANTHROPIC', model: 'claude-sonnet-4', displayName: 'Claude Sonnet 4' };

describe('useBestOfNPage — fileIds round-trip', () => {
  beforeEach(() => {
    sendMock.mockReset();
    sendMock.mockResolvedValue({ messageId: 'm1', threadId: 't1' });
  });

  it('omits fileIds from the payload when nothing is attached', async () => {
    const { result } = renderHook(() => useBestOfNPage(), { wrapper });

    act(() => {
      result.current.setContent('explain this attached file');
      result.current.setSelectedModel(MODEL);
    });

    expect(result.current.composer.selectedFileIds).toEqual([]);

    act(() => {
      result.current.handleSend();
    });

    await waitFor(() => {
      expect(sendMock).toHaveBeenCalledTimes(1);
    });

    const payload = sendMock.mock.calls[0]?.[0] as BestOfNRequest;
    expect(payload.fileIds).toBeUndefined();
  });

  it('forwards the selected file ids as fileIds', async () => {
    const { result } = renderHook(() => useBestOfNPage(), { wrapper });

    act(() => {
      result.current.setContent('explain this attached file');
      result.current.setSelectedModel(MODEL);
      result.current.composer.setSelectedFileIds(['file-1', 'file-2']);
    });

    act(() => {
      result.current.handleSend();
    });

    await waitFor(() => {
      expect(sendMock).toHaveBeenCalledTimes(1);
    });

    const payload = sendMock.mock.calls[0]?.[0] as BestOfNRequest;
    expect(payload.fileIds).toEqual(['file-1', 'file-2']);
  });

  it('clears the selection after a send so the next run does not re-send it', async () => {
    const { result } = renderHook(() => useBestOfNPage(), { wrapper });

    act(() => {
      result.current.setContent('explain this attached file');
      result.current.setSelectedModel(MODEL);
      result.current.composer.setSelectedFileIds(['file-1']);
    });

    act(() => {
      result.current.handleSend();
    });

    await waitFor(() => {
      expect(result.current.composer.selectedFileIds).toEqual([]);
    });
  });
});
