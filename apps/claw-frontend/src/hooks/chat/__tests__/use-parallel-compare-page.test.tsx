import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren, ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ResearchMode } from '@/enums';
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
    isParallelError: false,
    handleViewInThread: () => undefined,
  }),
}));

vi.mock('@/hooks/chat/use-parallel-stream', () => ({
  useParallelStream: () => ({ lanes: {} }),
}));

vi.mock('@/hooks/research/use-research-providers', () => ({
  useResearchProviders: () => ({
    providers: [],
    isLoading: false,
    isError: false,
    error: null,
  }),
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

  it('defaults research to AUTO and forwards it — Compare used to default to NONE', async () => {
    const { result } = renderHook(() => useParallelComparePage(), { wrapper });

    act(() => {
      result.current.setPrompt('hello');
      result.current.handleToggleModel('OPENAI', 'gpt-4o', true);
      result.current.handleToggleModel('ANTHROPIC', 'claude-sonnet-4', true);
    });

    expect(result.current.research.mode).toBe(ResearchMode.AUTO);

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
    expect(payload.researchMode).toBe(ResearchMode.AUTO);
    expect(payload.researchProviderId).toBeUndefined();
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

  it('forwards researchMode AND researchProviderId when both are set', async () => {
    const { result } = renderHook(() => useParallelComparePage(), { wrapper });

    act(() => {
      result.current.setPrompt('hello');
      result.current.handleToggleModel('OPENAI', 'gpt-4o', true);
      result.current.handleToggleModel('ANTHROPIC', 'claude-sonnet-4', true);
      result.current.setResearch({ mode: ResearchMode.SEARCH_FETCH, providerId: 'prov-9' });
    });

    expect(result.current.research.mode).toBe(ResearchMode.SEARCH_FETCH);

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
    expect(payload.researchMode).toBe(ResearchMode.SEARCH_FETCH);
    expect(payload.researchProviderId).toBe('prov-9');
  });

  it('omits BOTH research fields at NONE', async () => {
    const { result } = renderHook(() => useParallelComparePage(), { wrapper });

    act(() => {
      result.current.setPrompt('hello');
      result.current.handleToggleModel('OPENAI', 'gpt-4o', true);
      result.current.handleToggleModel('ANTHROPIC', 'claude-sonnet-4', true);
      result.current.setResearch({ mode: ResearchMode.NONE, providerId: 'prov-9' });
    });

    act(() => {
      result.current.handleSend();
    });

    await waitFor(() => {
      expect(sendParallelMock).toHaveBeenCalledTimes(1);
    });
    const payload = sendParallelMock.mock.calls[0]![0] as ParallelRequest;
    expect(payload.researchMode).toBeUndefined();
    expect(payload.researchProviderId).toBeUndefined();
  });
});
