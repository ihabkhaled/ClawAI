import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren, ReactElement } from 'react';
import { createElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useParallelComparePage } from '@/hooks/chat/use-parallel-compare-page';
import type { ParallelRequest } from '@/types';

const sendParallelMock = vi.fn();

vi.mock('@/repositories/chat/chat.repository', () => ({
  chatRepository: {
    sendParallel: (data: ParallelRequest) => sendParallelMock(data),
  },
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock('@/hooks/chat/use-judge-model-options', () => ({
  useJudgeModelOptions: () => ({ options: [], isLoading: false }),
}));

vi.mock('@/hooks/chat/use-parallel-poll', () => ({
  useParallelPoll: () => ({
    pollingMessages: [],
    isPolling: false,
    allResponded: false,
    handleViewInThread: () => undefined,
  }),
}));

vi.mock('@/hooks/chat/use-parallel-stream', () => ({
  useParallelStream: () => ({ lanes: {} }),
}));

vi.mock('@/utilities', () => ({
  logger: { info: vi.fn(), error: vi.fn() },
  showToast: { apiError: vi.fn(), success: vi.fn() },
}));

const wrapper = ({ children }: PropsWithChildren): ReactElement => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return createElement(QueryClientProvider, { client }, children);
};

describe('useParallelComparePage — fileIds round-trip', () => {
  beforeEach(() => {
    sendParallelMock.mockReset();
    sendParallelMock.mockResolvedValue({
      messageId: 'm1',
      threadId: 't1',
      prompt: '',
      responses: [],
      totalLatencyMs: 0,
      completedCount: 0,
      failedCount: 0,
      judgeEnabled: false,
      judgeModel: null,
    });
  });

  it('defaults selectedFileIds to [] and omits fileIds from the send payload', async () => {
    const { result } = renderHook(() => useParallelComparePage(), { wrapper });

    act(() => {
      result.current.setPrompt('hello');
      result.current.handleToggleModel('OPENAI', 'gpt-4o', true);
      result.current.handleToggleModel('ANTHROPIC', 'claude-sonnet-4', true);
    });

    expect(result.current.selectedFileIds).toEqual([]);

    act(() => {
      result.current.handleSend();
    });

    await waitFor(() => {
      expect(sendParallelMock).toHaveBeenCalledTimes(1);
    });

    const payload = sendParallelMock.mock.calls[0]?.[0] as ParallelRequest;
    expect(payload.fileIds).toBeUndefined();
  });

  it('forwards selectedFileIds as fileIds when the user picked at least one', async () => {
    const { result } = renderHook(() => useParallelComparePage(), { wrapper });

    act(() => {
      result.current.setPrompt('explain this file');
      result.current.handleToggleModel('OPENAI', 'gpt-4o', true);
      result.current.handleToggleModel('ANTHROPIC', 'claude-sonnet-4', true);
      result.current.setSelectedFileIds(['file-1', 'file-2']);
    });

    expect(result.current.selectedFileIds).toEqual(['file-1', 'file-2']);

    act(() => {
      result.current.handleSend();
    });

    await waitFor(() => {
      expect(sendParallelMock).toHaveBeenCalledTimes(1);
    });

    const payload = sendParallelMock.mock.calls[0]?.[0] as ParallelRequest;
    expect(payload.fileIds).toEqual(['file-1', 'file-2']);
  });

  it('resets selectedFileIds to [] after a send', async () => {
    const { result } = renderHook(() => useParallelComparePage(), { wrapper });

    act(() => {
      result.current.setPrompt('explain this file');
      result.current.handleToggleModel('OPENAI', 'gpt-4o', true);
      result.current.handleToggleModel('ANTHROPIC', 'claude-sonnet-4', true);
      result.current.setSelectedFileIds(['file-1']);
    });

    act(() => {
      result.current.handleSend();
    });

    await waitFor(() => {
      expect(sendParallelMock).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(result.current.selectedFileIds).toEqual([]);
    });
  });
});
