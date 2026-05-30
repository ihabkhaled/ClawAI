import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren, ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CompareResearchMode } from '@/enums';
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
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

describe('useParallelComparePage — researchMode round-trip', () => {
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

  it('defaults researchMode to NONE and omits it from the send payload', async () => {
    const { result } = renderHook(() => useParallelComparePage(), { wrapper });

    act(() => {
      result.current.setPrompt('hello');
      result.current.handleToggleModel('OPENAI', 'gpt-4o', true);
      result.current.handleToggleModel('ANTHROPIC', 'claude-sonnet-4', true);
    });

    expect(result.current.researchMode).toBe(CompareResearchMode.NONE);

    act(() => {
      result.current.handleSend();
    });

    await waitFor(() => {
      expect(sendParallelMock).toHaveBeenCalledTimes(1);
    });
    const [firstCall] = sendParallelMock.mock.calls;
    if (!firstCall) {
      throw new Error('sendParallel was not called');
    }
    const payload = firstCall[0] as ParallelRequest;
    expect(payload.researchMode).toBeUndefined();
    expect(payload.content).toBe('hello');
  });

  it('threads criticEnabled + criticModel through when judge is also on', async () => {
    const { result } = renderHook(() => useParallelComparePage(), { wrapper });

    act(() => {
      result.current.setPrompt('hello');
      result.current.handleToggleModel('OPENAI', 'gpt-4o', true);
      result.current.handleToggleModel('ANTHROPIC', 'claude-sonnet-4', true);
      result.current.setJudgeEnabled(true);
      result.current.setCriticEnabled(true);
      result.current.setCriticModel('OPENAI:gpt-4o-mini');
    });

    act(() => {
      result.current.handleSend();
    });

    await waitFor(() => {
      expect(sendParallelMock).toHaveBeenCalledTimes(1);
    });
    const payload = sendParallelMock.mock.calls[0]![0] as ParallelRequest;
    expect(payload.criticEnabled).toBe(true);
    expect(payload.criticModel).toBe('OPENAI:gpt-4o-mini');
  });

  it('drops critic fields when judge is off (UI rule)', async () => {
    const { result } = renderHook(() => useParallelComparePage(), { wrapper });

    act(() => {
      result.current.setPrompt('hello');
      result.current.handleToggleModel('OPENAI', 'gpt-4o', true);
      result.current.handleToggleModel('ANTHROPIC', 'claude-sonnet-4', true);
      result.current.setCriticEnabled(true);
      result.current.setCriticModel('OPENAI:gpt-4o-mini');
    });

    act(() => {
      result.current.handleSend();
    });

    await waitFor(() => {
      expect(sendParallelMock).toHaveBeenCalledTimes(1);
    });
    const payload = sendParallelMock.mock.calls[0]![0] as ParallelRequest;
    expect(payload.criticEnabled).toBeUndefined();
    expect(payload.criticModel).toBeUndefined();
  });

  it('forwards researchMode when set to a non-NONE value', async () => {
    const { result } = renderHook(() => useParallelComparePage(), { wrapper });

    act(() => {
      result.current.setPrompt('hello');
      result.current.handleToggleModel('OPENAI', 'gpt-4o', true);
      result.current.handleToggleModel('ANTHROPIC', 'claude-sonnet-4', true);
      result.current.setResearchMode(CompareResearchMode.SEARCH_FETCH);
    });

    expect(result.current.researchMode).toBe(CompareResearchMode.SEARCH_FETCH);

    act(() => {
      result.current.handleSend();
    });

    await waitFor(() => {
      expect(sendParallelMock).toHaveBeenCalledTimes(1);
    });
    const [firstCall] = sendParallelMock.mock.calls;
    if (!firstCall) {
      throw new Error('sendParallel was not called');
    }
    const payload = firstCall[0] as ParallelRequest;
    expect(payload.researchMode).toBe(CompareResearchMode.SEARCH_FETCH);
  });
});
