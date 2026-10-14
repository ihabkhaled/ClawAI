import type { PluginMentionView } from '@claw/shared-types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren, ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useInThreadCompare } from '@/hooks/chat/use-in-thread-compare';
import { useParallelComparePage } from '@/hooks/chat/use-parallel-compare-page';
import type { ParallelRequest } from '@/types';

const sendParallelMock = vi.fn();

vi.mock('@/repositories/chat/chat.repository', () => ({
  chatRepository: { sendParallel: (data: ParallelRequest) => sendParallelMock(data) },
}));
vi.mock('@/hooks/chat/use-plugin-mention-options', () => ({
  usePluginMentionOptions: () => [],
}));
vi.mock('@/lib/i18n/use-translation', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
vi.mock('@/hooks/files/use-files', () => ({ useFiles: () => ({ files: [] }) }));
vi.mock('@/lib/i18n', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
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
vi.mock('@/hooks/chat/use-parallel-stream', () => ({ useParallelStream: () => ({ lanes: {} }) }));
vi.mock('@/hooks/research/use-research-providers', () => ({
  useResearchProviders: () => ({ providers: [], isLoading: false, isError: false, error: null }),
}));
vi.mock('@/utilities', () => ({
  logger: { info: vi.fn(), error: vi.fn() },
  showToast: { apiError: vi.fn(), success: vi.fn() },
}));

const WEB: PluginMentionView = {
  installId: 'i-web',
  slug: 'web-fetch',
  name: 'Web fetch',
  iconKey: 'globe',
  enabled: true,
};

const wrapper = ({ children }: PropsWithChildren): ReactElement => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

function firstPayload(): ParallelRequest {
  const call = sendParallelMock.mock.calls[0];
  if (!call) {
    throw new Error('sendParallel was not called');
  }
  return call[0] as ParallelRequest;
}

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

describe('Compare page — @mentioned plugins reach every lane', () => {
  it('sends pluginRefs with the run and forgets them afterwards', async () => {
    const { result } = renderHook(() => useParallelComparePage(), { wrapper });
    act(() => {
      result.current.pluginMentions.add(WEB, '');
      result.current.setPrompt('read it @Web fetch ');
      result.current.handleToggleModel('OPENAI', 'gpt-4o', true);
      result.current.handleToggleModel('ANTHROPIC', 'claude-sonnet-4', true);
    });
    act(() => {
      result.current.handleSend();
    });

    await waitFor(() => {
      expect(sendParallelMock).toHaveBeenCalledTimes(1);
    });
    expect(firstPayload().pluginRefs).toEqual([{ installId: 'i-web', label: 'Web fetch' }]);
    expect(result.current.pluginMentions.refs).toEqual([]);
  });

  it('sends no pluginRefs when nothing was mentioned', async () => {
    const { result } = renderHook(() => useParallelComparePage(), { wrapper });
    act(() => {
      result.current.setPrompt('hello');
      result.current.handleToggleModel('OPENAI', 'gpt-4o', true);
      result.current.handleToggleModel('ANTHROPIC', 'claude-sonnet-4', true);
    });
    act(() => {
      result.current.handleSend();
    });
    await waitFor(() => {
      expect(sendParallelMock).toHaveBeenCalledTimes(1);
    });
    expect(Object.keys(firstPayload())).not.toContain('pluginRefs');
  });
});

describe('In-thread Compare — @mentioned plugins reach every lane', () => {
  it('sends pluginRefs with the run and forgets them afterwards', async () => {
    const { result } = renderHook(() => useInThreadCompare({ threadId: 't1' }), { wrapper });
    act(() => {
      result.current.pluginMentions.add(WEB, '');
      result.current.setPrompt('read it @Web fetch ');
      result.current.handleToggleModel('OPENAI', 'gpt-4o', true);
      result.current.handleToggleModel('ANTHROPIC', 'claude-sonnet-4', true);
    });
    act(() => {
      result.current.handleSend();
    });

    await waitFor(() => {
      expect(sendParallelMock).toHaveBeenCalledTimes(1);
    });
    const payload = firstPayload();
    expect(payload.threadId).toBe('t1');
    expect(payload.pluginRefs).toEqual([{ installId: 'i-web', label: 'Web fetch' }]);
    expect(result.current.pluginMentions.refs).toEqual([]);
  });
});
