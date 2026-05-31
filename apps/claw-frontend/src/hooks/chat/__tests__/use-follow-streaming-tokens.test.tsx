import { renderHook } from '@testing-library/react';
import { useRef } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useFollowStreamingTokens } from '@/hooks/chat/use-follow-streaming-tokens';
import type { VirtuosoHandle } from '@/lib/virtuoso';
import type { UseFollowStreamingTokensParams } from '@/types';

type ScrollToIndexFn = NonNullable<VirtuosoHandle['scrollToIndex']>;

function createVirtuosoRef(scrollToIndex: ScrollToIndexFn): React.RefObject<VirtuosoHandle | null> {
  // Hand-roll a stable ref so the hook can reach into .current.scrollToIndex
  // exactly the way it would in the running app.
  return {
    current: {
      scrollToIndex,
      scrollTo: vi.fn(),
      scrollBy: vi.fn(),
      scrollIntoView: vi.fn(),
      getState: vi.fn(),
      autoscrollToBottom: vi.fn(),
    } as unknown as VirtuosoHandle,
  };
}

function harness(initial: Omit<UseFollowStreamingTokensParams, 'virtuosoRef'>): {
  rerender: (next: Omit<UseFollowStreamingTokensParams, 'virtuosoRef'>) => void;
  scrollToIndex: ScrollToIndexFn;
} {
  const scrollToIndex = vi.fn() as unknown as ScrollToIndexFn;
  const refObject = createVirtuosoRef(scrollToIndex);
  const { rerender } = renderHook(
    (params: Omit<UseFollowStreamingTokensParams, 'virtuosoRef'>) => {
      const ref = useRef<VirtuosoHandle | null>(refObject.current);
      ref.current = refObject.current;
      useFollowStreamingTokens({ ...params, virtuosoRef: ref });
    },
    { initialProps: initial },
  );
  return { rerender, scrollToIndex };
}

describe('useFollowStreamingTokens', () => {
  it('scrolls to the last index when streaming content grows AND user is at bottom', () => {
    const { rerender, scrollToIndex } = harness({
      isAtBottom: true,
      lastMessageId: 'm1',
      lastContentLength: 10,
      lastIndex: 0,
    });
    rerender({ isAtBottom: true, lastMessageId: 'm1', lastContentLength: 25, lastIndex: 0 });
    // First call on mount when isAtBottom, then again on growth.
    expect(scrollToIndex).toHaveBeenLastCalledWith({
      index: 0,
      behavior: 'auto',
      align: 'end',
    });
    expect((scrollToIndex as unknown as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('does NOT scroll when the user has scrolled up (isAtBottom === false)', () => {
    const { rerender, scrollToIndex } = harness({
      isAtBottom: false,
      lastMessageId: 'm1',
      lastContentLength: 10,
      lastIndex: 0,
    });
    rerender({ isAtBottom: false, lastMessageId: 'm1', lastContentLength: 50, lastIndex: 0 });
    expect(scrollToIndex).not.toHaveBeenCalled();
  });

  it('does NOT scroll when content has not grown and message id is unchanged', () => {
    const { rerender, scrollToIndex } = harness({
      isAtBottom: true,
      lastMessageId: 'm1',
      lastContentLength: 10,
      lastIndex: 0,
    });
    (scrollToIndex as unknown as ReturnType<typeof vi.fn>).mockClear();
    rerender({ isAtBottom: true, lastMessageId: 'm1', lastContentLength: 10, lastIndex: 0 });
    expect(scrollToIndex).not.toHaveBeenCalled();
  });

  it('scrolls when a new message id arrives even without length growth', () => {
    const { rerender, scrollToIndex } = harness({
      isAtBottom: true,
      lastMessageId: 'm1',
      lastContentLength: 20,
      lastIndex: 0,
    });
    (scrollToIndex as unknown as ReturnType<typeof vi.fn>).mockClear();
    rerender({ isAtBottom: true, lastMessageId: 'm2', lastContentLength: 5, lastIndex: 1 });
    expect(scrollToIndex).toHaveBeenCalledWith({ index: 1, behavior: 'auto', align: 'end' });
  });

  it('does nothing when there are no rows (lastIndex < 0)', () => {
    const { rerender, scrollToIndex } = harness({
      isAtBottom: true,
      lastMessageId: null,
      lastContentLength: 0,
      lastIndex: -1,
    });
    rerender({ isAtBottom: true, lastMessageId: 'm1', lastContentLength: 5, lastIndex: -1 });
    expect(scrollToIndex).not.toHaveBeenCalled();
  });
});
