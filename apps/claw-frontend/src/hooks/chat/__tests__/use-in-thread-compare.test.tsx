import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren, ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CompareResearchMode } from '@/enums';
import { useInThreadCompare } from '@/hooks/chat/use-in-thread-compare';
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

vi.mock('@/utilities', () => ({
  logger: { info: vi.fn(), error: vi.fn() },
  showToast: { apiError: vi.fn(), success: vi.fn() },
}));

const wrapper = ({ children }: PropsWithChildren): ReactElement => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

describe('useInThreadCompare — researchMode round-trip', () => {
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

  it('defaults researchMode to NONE and omits it from the compare payload', async () => {
    const { result } = renderHook(() => useInThreadCompare({ threadId: 't1' }), { wrapper });

    act(() => {
      result.current.handleToggleModel('OPENAI', 'gpt-4o', true);
      result.current.handleToggleModel('ANTHROPIC', 'claude-sonnet-4', true);
    });

    expect(result.current.researchMode).toBe(CompareResearchMode.NONE);

    act(() => {
      result.current.handleCompare('hello');
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
    expect(payload.threadId).toBe('t1');
    expect(payload.content).toBe('hello');
  });

  it('forwards researchMode when set to SEARCH_EXTRACT', async () => {
    const { result } = renderHook(() => useInThreadCompare({ threadId: 't1' }), { wrapper });

    act(() => {
      result.current.handleToggleModel('OPENAI', 'gpt-4o', true);
      result.current.handleToggleModel('ANTHROPIC', 'claude-sonnet-4', true);
      result.current.setResearchMode(CompareResearchMode.SEARCH_EXTRACT);
    });

    act(() => {
      result.current.handleCompare('grounded prompt');
    });

    await waitFor(() => {
      expect(sendParallelMock).toHaveBeenCalledTimes(1);
    });
    const [firstCall] = sendParallelMock.mock.calls;
    if (!firstCall) {
      throw new Error('sendParallel was not called');
    }
    const payload = firstCall[0] as ParallelRequest;
    expect(payload.researchMode).toBe(CompareResearchMode.SEARCH_EXTRACT);
  });
});
