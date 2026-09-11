import type { InfiniteData, QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import { MessageRole } from '@/enums';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { ChatMessage, MessagesListResponse } from '@/types';
import { mergeLatestMessagesPageIntoCache } from '@/utilities/merge-latest-messages-page-into-cache.utility';

function buildMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: 'msg-1',
    threadId: 't-1',
    role: MessageRole.ASSISTANT,
    content: 'hello',
    provider: null,
    model: null,
    routingMode: null,
    routerModel: null,
    usedFallback: false,
    inputTokens: null,
    outputTokens: null,
    feedback: null,
    latencyMs: null,
    metadata: null,
    createdAt: '2026-09-11T00:00:00.000Z',
    ...overrides,
  };
}

function buildPage(
  messages: ChatMessage[],
  meta: Partial<MessagesListResponse['meta']> = {},
): MessagesListResponse {
  return {
    data: messages,
    meta: { total: messages.length, limit: 50, nextBefore: null, ...meta },
  };
}

function buildCache(pages: MessagesListResponse[]): InfiniteData<MessagesListResponse> {
  // Cursor pagination: pageParams are message ids (or undefined for the
  // newest page), not page numbers.
  return { pages, pageParams: pages.map(() => undefined) };
}

function withMockClient(initial: InfiniteData<MessagesListResponse> | undefined): {
  client: QueryClient;
  getData: () => InfiniteData<MessagesListResponse> | undefined;
} {
  let stored = initial;
  const client = {
    setQueryData: (
      _key: readonly unknown[],
      updater: (
        old: InfiniteData<MessagesListResponse> | undefined,
      ) => InfiniteData<MessagesListResponse> | undefined,
    ) => {
      stored = updater(stored);
    },
  } as unknown as QueryClient;
  return { client, getData: () => stored };
}

/**
 * A poll targeted at page 1 only, in place of `refetchInterval` re-fetching
 * every loaded page (B9), with an ordering guard against a stale response
 * arriving after a fresher one (B10).
 */
describe('mergeLatestMessagesPageIntoCache', () => {
  it('replaces only page 1, leaving older pages untouched', () => {
    const page1 = buildPage([buildMessage({ id: 'msg-old' })], {
      total: 51,
      nextBefore: 'msg-old',
    });
    const page2 = buildPage([buildMessage({ id: 'msg-ancient' })], { total: 51 });
    const { client, getData } = withMockClient(buildCache([page1, page2]));

    const freshPage1 = buildPage(
      [buildMessage({ id: 'msg-new' }), buildMessage({ id: 'msg-old' })],
      { total: 52, nextBefore: 'msg-old' },
    );
    mergeLatestMessagesPageIntoCache(client, 't-1', freshPage1);

    expect(getData()?.pages[0]).toBe(freshPage1);
    expect(getData()?.pages[1]).toBe(page2);
  });

  it('drops a response reporting a lower total than what is already cached', () => {
    // The ordering guard: a page fetched earlier resolving after one fetched
    // later must not clobber the fresher data already showing.
    const fresher = buildPage([buildMessage({ id: 'msg-2' }), buildMessage({ id: 'msg-1' })], {
      total: 2,
    });
    const { client, getData } = withMockClient(buildCache([fresher]));

    const stale = buildPage([buildMessage({ id: 'msg-1' })], { total: 1 });
    mergeLatestMessagesPageIntoCache(client, 't-1', stale);

    expect(getData()?.pages[0]).toBe(fresher);
  });

  it('accepts a response reporting the same total (no change since the last poll)', () => {
    const current = buildPage([buildMessage({ id: 'msg-1' })], { total: 1 });
    const { client, getData } = withMockClient(buildCache([current]));

    const sameTotal = buildPage([buildMessage({ id: 'msg-1' })], { total: 1 });
    mergeLatestMessagesPageIntoCache(client, 't-1', sameTotal);

    expect(getData()?.pages[0]).toBe(sameTotal);
  });

  it('does nothing when nothing is cached yet', () => {
    const { client, getData } = withMockClient(undefined);

    mergeLatestMessagesPageIntoCache(client, 't-1', buildPage([buildMessage()]));

    expect(getData()).toBeUndefined();
  });

  it('writes to the key the thread page actually reads, scoped to the thread', () => {
    const setQueryData = vi.fn();
    const client = { setQueryData } as unknown as QueryClient;

    mergeLatestMessagesPageIntoCache(client, 't-42', buildPage([buildMessage()]));

    expect(setQueryData.mock.calls[0]?.[0]).toEqual(queryKeys.threads.messagesInfinite('t-42'));
  });
});
