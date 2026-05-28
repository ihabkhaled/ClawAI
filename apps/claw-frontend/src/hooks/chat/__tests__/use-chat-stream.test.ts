import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FallbackFailureType, StreamEventType, VisibleProgressStageStatus } from '@/enums';
import { useChatStream } from '@/hooks/chat/use-chat-stream';
import type { SseConnection } from '@/types';

type ConnectOptions = {
  onMessage: (data: string) => void;
  onError: () => void;
};

const { mockConnectSse, mockLogger } = vi.hoisted(() => ({
  mockConnectSse: vi.fn(),
  mockLogger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// `t` MUST be a stable reference: the real useTranslation memoizes it with
// useCallback, and useChatStream lists `t` in a useEffect dependency array.
// Returning a fresh `t` per render makes that effect re-run every render →
// resetStream() → setState → re-render → infinite loop that OOMs the worker.
// Define it inside the factory (which runs once) so every call reuses it.
vi.mock('@/lib/i18n', () => {
  const t = (key: string): string => key;
  return {
    useTranslation: () => ({
      t,
      locale: 'en',
      dir: 'ltr',
    }),
  };
});

vi.mock('@/utilities', () => ({
  connectSse: (...args: unknown[]) => mockConnectSse(...args),
  logger: mockLogger,
}));

describe('useChatStream', () => {
  let closeSpy: ReturnType<typeof vi.fn>;
  let capturedOptions: ConnectOptions;

  beforeEach(() => {
    vi.clearAllMocks();
    closeSpy = vi.fn();
    capturedOptions = {
      onMessage: vi.fn(),
      onError: vi.fn(),
    };

    mockConnectSse.mockImplementation((_url: string, options: ConnectOptions): SseConnection => {
      capturedOptions = options;
      return {
        close: closeSpy as () => void,
      };
    });
  });

  it('tracks visible progress stages and completes the stream state on done', () => {
    const { result } = renderHook(() => useChatStream('thread-1', true));

    act(() => {
      capturedOptions.onMessage(
        JSON.stringify({
          threadId: 'thread-1',
          type: StreamEventType.REQUEST_ACCEPTED,
          label: 'Request accepted',
          actorName: 'Claw',
        }),
      );
      capturedOptions.onMessage(
        JSON.stringify({
          threadId: 'thread-1',
          type: StreamEventType.PROVIDER_SELECTED,
          provider: 'local-ollama',
          model: 'qwen3:1.7b',
          label: 'Model selected',
        }),
      );
      capturedOptions.onMessage(
        JSON.stringify({
          threadId: 'thread-1',
          type: StreamEventType.DONE,
          provider: 'local-ollama',
          model: 'qwen3:1.7b',
          label: 'Response complete',
        }),
      );
    });

    expect(result.current.executingModel).toBeNull();
    expect(result.current.currentStageLabel).toBe('Response complete');
    expect(result.current.progressStages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: StreamEventType.REQUEST_ACCEPTED,
          status: VisibleProgressStageStatus.ACTIVE,
        }),
        expect.objectContaining({
          type: StreamEventType.PROVIDER_SELECTED,
          provider: 'local-ollama',
          model: 'qwen3:1.7b',
          status: VisibleProgressStageStatus.ACTIVE,
        }),
        expect.objectContaining({
          type: StreamEventType.DONE,
          status: VisibleProgressStageStatus.COMPLETED,
        }),
      ]),
    );
  });

  it('records fallback attempts and stream errors with the correct failure types', () => {
    const { result } = renderHook(() => useChatStream('thread-2', true));

    act(() => {
      capturedOptions.onMessage(
        JSON.stringify({
          threadId: 'thread-2',
          type: StreamEventType.FALLBACK_ATTEMPT,
          failedProvider: 'OLLAMA',
          failedModel: 'glm-5.1:cloud',
          error: 'Weak response from upstream model',
          attempt: 1,
          totalCandidates: 3,
          nextProvider: 'local-ollama',
          nextModel: 'qwen3:1.7b',
          label: 'Fallback in progress',
        }),
      );
      capturedOptions.onMessage(
        JSON.stringify({
          threadId: 'thread-2',
          type: StreamEventType.ERROR,
          error: 'All providers failed',
          label: 'Response failed',
        }),
      );
    });

    expect(result.current.fallbackAttempts).toEqual([
      expect.objectContaining({
        failedProvider: 'OLLAMA',
        failedModel: 'glm-5.1:cloud',
        failureType: FallbackFailureType.QUALITY,
        nextProvider: 'local-ollama',
        nextModel: 'qwen3:1.7b',
      }),
    ]);
    expect(result.current.streamError).toBe('All providers failed');
    expect(result.current.progressStages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: StreamEventType.FALLBACK_ATTEMPT,
          status: VisibleProgressStageStatus.ACTIVE,
        }),
        expect.objectContaining({
          type: StreamEventType.ERROR,
          status: VisibleProgressStageStatus.ERROR,
        }),
      ]),
    );
  });

  it('closes the SSE connection when the stream becomes inactive', () => {
    const { rerender, unmount } = renderHook(
      ({ isActive }) => useChatStream('thread-3', isActive),
      {
        initialProps: { isActive: true },
      },
    );

    rerender({ isActive: false });

    expect(closeSpy).toHaveBeenCalledTimes(1);

    unmount();

    expect(closeSpy).toHaveBeenCalledTimes(1);
  });

  it('tracks typed tool and research progress events using stable stage ids and statuses', () => {
    const { result } = renderHook(() => useChatStream('thread-progress', true));

    act(() => {
      capturedOptions.onMessage(
        JSON.stringify({
          threadId: 'thread-progress',
          type: StreamEventType.RESEARCH_STARTED,
          stageId: 'research:evidence',
          status: VisibleProgressStageStatus.ACTIVE,
          label: 'Gathering evidence',
          description: 'Searching trusted sources.',
          actorType: 'tool',
          actorName: 'Research workflow',
          sequence: 1,
          createdAt: '2026-04-23T07:00:00.000Z',
        }),
      );
      capturedOptions.onMessage(
        JSON.stringify({
          threadId: 'thread-progress',
          type: StreamEventType.RESEARCH_COMPLETED,
          stageId: 'research:evidence',
          status: VisibleProgressStageStatus.COMPLETED,
          label: 'Evidence ready',
          description: 'Collected 6 evidence items.',
          actorType: 'tool',
          actorName: 'Research workflow',
          sequence: 2,
          createdAt: '2026-04-23T07:00:01.000Z',
        }),
      );
    });

    expect(result.current.currentStageLabel).toBe('Evidence ready');
    expect(result.current.progressStages).toEqual([
      expect.objectContaining({
        id: 'research:evidence',
        type: StreamEventType.RESEARCH_COMPLETED,
        status: VisibleProgressStageStatus.COMPLETED,
        sequence: 2,
      }),
    ]);
  });
});
