import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren, ReactElement } from 'react';
import { createElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ResearchMode } from '@/enums/research-mode.enum';
import { useBestOfNPage } from '@/hooks/chat/use-best-of-n-page';
import { useEscalationPage } from '@/hooks/chat/use-escalation-page';
import type { BestOfNRequest, EscalationChainRequest } from '@/types';
import type * as UtilitiesModule from '@/utilities';

// The whole lab research path was dead for one reason: no lab frontend ever
// put `researchMode` on a payload. These are the tests that would have caught
// it — they assert the field is on the wire, and that NONE omits it rather
// than sending the string.

const bestOfNSendMock = vi.fn();
const escalationSendMock = vi.fn();

vi.mock('@/repositories/chat/chat.repository', () => ({
  chatRepository: {
    bestOfNMessage: (data: BestOfNRequest) => bestOfNSendMock(data),
    sendEscalationChain: (data: EscalationChainRequest) => escalationSendMock(data),
  },
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock('@/hooks/research/use-research-providers', () => ({
  useResearchProviders: () => ({
    providers: [],
    isLoading: false,
    isError: false,
    error: null,
  }),
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

vi.mock('@/hooks/chat/use-escalation-poll', () => ({
  useEscalationPoll: () => ({
    synthesisMessage: null,
    isPolling: false,
    isSynthesisReady: false,
    handleViewInThread: () => undefined,
  }),
}));

vi.mock('@/hooks/chat/use-orchestration-stages', () => ({
  useOrchestrationStages: () => ({
    stages: [],
    hasProgress: false,
    errorMessage: null,
    reset: () => undefined,
  }),
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

describe('orchestration labs — research reaches the payload', () => {
  beforeEach(() => {
    bestOfNSendMock.mockReset();
    bestOfNSendMock.mockResolvedValue({ messageId: 'm1', threadId: 't1' });
    escalationSendMock.mockReset();
    escalationSendMock.mockResolvedValue({ messageId: 'm1', threadId: 't1', prompt: '' });
  });

  it('defaults to AUTO and sends researchMode on a top-level lab payload', async () => {
    const { result } = renderHook(() => useBestOfNPage(), { wrapper });

    expect(result.current.composer.research.mode).toBe(ResearchMode.AUTO);

    act(() => {
      result.current.setContent('what happened in the news today');
      result.current.setSelectedModel(MODEL);
    });

    act(() => {
      result.current.handleSend();
    });

    await waitFor(() => {
      expect(bestOfNSendMock).toHaveBeenCalledTimes(1);
    });

    const payload = bestOfNSendMock.mock.calls[0]?.[0] as BestOfNRequest;
    expect(payload.researchMode).toBe(ResearchMode.AUTO);
    expect(payload.researchProviderId).toBeUndefined();
  });

  it('sends the chosen provider alongside a concrete mode', async () => {
    const { result } = renderHook(() => useBestOfNPage(), { wrapper });

    act(() => {
      result.current.setContent('what happened in the news today');
      result.current.setSelectedModel(MODEL);
      result.current.composer.setResearch({
        mode: ResearchMode.SEARCH_FETCH,
        providerId: 'provider-1',
      });
    });

    act(() => {
      result.current.handleSend();
    });

    await waitFor(() => {
      expect(bestOfNSendMock).toHaveBeenCalledTimes(1);
    });

    const payload = bestOfNSendMock.mock.calls[0]?.[0] as BestOfNRequest;
    expect(payload.researchMode).toBe(ResearchMode.SEARCH_FETCH);
    expect(payload.researchProviderId).toBe('provider-1');
  });

  it('omits both fields entirely when the mode is NONE', async () => {
    const { result } = renderHook(() => useBestOfNPage(), { wrapper });

    act(() => {
      result.current.setContent('what happened in the news today');
      result.current.setSelectedModel(MODEL);
      result.current.composer.setResearch({ mode: ResearchMode.NONE });
    });

    act(() => {
      result.current.handleSend();
    });

    await waitFor(() => {
      expect(bestOfNSendMock).toHaveBeenCalledTimes(1);
    });

    const payload = bestOfNSendMock.mock.calls[0]?.[0] as BestOfNRequest;
    expect(payload.researchMode).toBeUndefined();
    expect(payload.researchProviderId).toBeUndefined();
    expect('researchMode' in payload).toBe(false);
  });

  it('keeps the research selection after a send — it is a preference, not the question', async () => {
    const { result } = renderHook(() => useBestOfNPage(), { wrapper });

    act(() => {
      result.current.setContent('what happened in the news today');
      result.current.setSelectedModel(MODEL);
      result.current.composer.setResearch({ mode: ResearchMode.NONE });
    });

    act(() => {
      result.current.handleSend();
    });

    await waitFor(() => {
      expect(bestOfNSendMock).toHaveBeenCalledTimes(1);
    });
    expect(result.current.composer.research.mode).toBe(ResearchMode.NONE);
  });

  it('fans the mode into every escalation chain step, because that DTO has no top-level research', async () => {
    const { result } = renderHook(() => useEscalationPage(), { wrapper });

    act(() => {
      result.current.setPrompt('what happened in the news today');
      result.current.setSelectedModel(MODEL);
      result.current.handleAddModel('OPENAI', 'gpt-4o');
      result.current.composer.setResearch({ mode: ResearchMode.SEARCH, providerId: 'provider-1' });
    });

    act(() => {
      result.current.handleSend();
    });

    await waitFor(() => {
      expect(escalationSendMock).toHaveBeenCalledTimes(1);
    });

    const payload = escalationSendMock.mock.calls[0]?.[0] as EscalationChainRequest;
    expect(payload.chain).toHaveLength(2);
    for (const step of payload.chain) {
      expect(step.researchMode).toBe(ResearchMode.SEARCH);
      expect(step.researchProviderId).toBe('provider-1');
    }
  });

  it('leaves escalation chain steps untouched when the mode is NONE', async () => {
    const { result } = renderHook(() => useEscalationPage(), { wrapper });

    act(() => {
      result.current.setPrompt('what happened in the news today');
      result.current.setSelectedModel(MODEL);
      result.current.handleAddModel('OPENAI', 'gpt-4o');
      result.current.composer.setResearch({ mode: ResearchMode.NONE });
    });

    act(() => {
      result.current.handleSend();
    });

    await waitFor(() => {
      expect(escalationSendMock).toHaveBeenCalledTimes(1);
    });

    const payload = escalationSendMock.mock.calls[0]?.[0] as EscalationChainRequest;
    for (const step of payload.chain) {
      expect(step.researchMode).toBeUndefined();
      expect(step.researchProviderId).toBeUndefined();
    }
  });
});
