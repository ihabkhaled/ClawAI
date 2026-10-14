import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const sendMessage = vi.fn();

vi.mock('./../use-send-message', () => ({
  useSendMessage: () => ({
    sendMessage,
    isPending: false,
    errorMessage: null,
    error: null,
  }),
}));
vi.mock('./../use-thread-detail', () => ({
  useThreadDetail: () => ({
    thread: undefined,
    messages: [],
    isLoadingThread: false,
    isLoadingMessages: false,
    isWaitingForResponse: false,
    connectionHealth: 'HEALTHY',
    fallbackAttempts: [],
    streamError: null,
    judgeEvaluating: false,
    executingModel: null,
    judgeModel: null,
    progressStages: [],
    narration: [],
    currentStageLabel: null,
    streamLive: false,
    startWaitingForResponse: vi.fn(),
    stopWaitingForResponse: vi.fn(),
    streamErrorCode: null,
    virtualizedMessages: {
      isFetchingPreviousPage: false,
      hasPreviousPage: false,
      firstItemIndex: 0,
      fetchPreviousPage: vi.fn(),
    },
  }),
}));
vi.mock('./../use-cancel-stream', () => ({
  useCancelStream: () => ({ cancel: vi.fn(), isCancelling: false }),
}));
vi.mock('./../use-delete-thread', () => ({
  useDeleteThread: () => ({ deleteThread: vi.fn(), isPending: false }),
}));
vi.mock('./../use-message-feedback', () => ({
  useMessageFeedback: () => ({ setFeedback: vi.fn() }),
}));
vi.mock('./../use-regenerate-message', () => ({
  useRegenerateMessage: () => ({ regenerate: vi.fn() }),
}));
vi.mock('./../use-thread-settings', () => ({ useThreadSettings: () => ({}) }));
vi.mock('./../use-virtualized-messages-controller', () => ({
  useVirtualizedMessagesController: () => ({}),
}));
vi.mock('@/hooks/plans/use-entitlements', () => ({
  useEntitlements: () => ({ entitlements: null }),
}));
vi.mock('@/stores/quote-draft.store', () => ({
  useQuoteDraftStore: { getState: () => ({ byThread: {} }) },
}));

const { useThreadDataController } = await import('../use-thread-data-controller');

describe('useThreadDataController — handleSend carries @mentioned plugins', () => {
  beforeEach(() => {
    sendMessage.mockReset();
  });

  function setup() {
    return renderHook(() =>
      useThreadDataController({
        threadId: 'thread-1',
        t: (key: string) => key,
        onSettingsSaved: vi.fn(),
      }),
    );
  }

  it('puts pluginRefs on the create-message request', () => {
    const { result } = setup();
    act(() => {
      result.current.handleSend(
        'summarise @Web fetch',
        undefined,
        undefined,
        undefined,
        undefined,
        [{ installId: 'i-web', label: 'Web fetch' }],
      );
    });
    expect(sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        threadId: 'thread-1',
        content: 'summarise @Web fetch',
        pluginRefs: [{ installId: 'i-web', label: 'Web fetch' }],
      }),
    );
  });

  it('leaves the field off for an ordinary message', () => {
    const { result } = setup();
    act(() => {
      result.current.handleSend('hello');
    });
    const [request] = sendMessage.mock.calls[0] as [Record<string, unknown>];
    expect(Object.keys(request)).not.toContain('pluginRefs');
  });

  it('leaves the field off for an empty list', () => {
    const { result } = setup();
    act(() => {
      result.current.handleSend('hello', undefined, undefined, undefined, undefined, []);
    });
    const [request] = sendMessage.mock.calls[0] as [Record<string, unknown>];
    expect(Object.keys(request)).not.toContain('pluginRefs');
  });
});
