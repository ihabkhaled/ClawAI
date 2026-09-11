import type { InfiniteData, QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import { MessageRole } from '@/enums';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { ChatMessage, MessagesListResponse } from '@/types';
import { insertSentMessageIntoCache } from '@/utilities/insert-sent-message-into-cache.utility';

function buildMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: 'msg-new',
    threadId: 't-1',
    role: MessageRole.USER,
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

function buildCache(pages: MessagesListResponse[]): InfiniteData<MessagesListResponse> {
  // Cursor pagination: pageParams are message ids (or undefined for the
  // newest page), not page numbers.
  return { pages, pageParams: pages.map(() => undefined) };
}

/**
 * `POST /chat-messages` already returns the authoritative row. This is what
 * makes writing it straight into the cache safe: there is nothing to
 * reconcile or roll back, unlike a true optimistic update made ahead of the
 * server's answer.
 */
describe('insertSentMessageIntoCache', () => {
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

  it('prepends the new message to the newest page', () => {
    const existing = buildMessage({ id: 'msg-old', content: 'earlier' });
    const { client, getData } = withMockClient(
      buildCache([{ data: [existing], meta: { total: 1, limit: 50, nextBefore: null } }]),
    );

    insertSentMessageIntoCache(client, 't-1', buildMessage());

    const page = getData()?.pages[0];
    expect(page?.data.map((m) => m.id)).toEqual(['msg-new', 'msg-old']);
  });

  it('increments total, leaving the pagination cursor untouched', () => {
    const existing = buildMessage({ id: 'msg-old' });
    const { client, getData } = withMockClient(
      buildCache([{ data: [existing], meta: { total: 50, limit: 50, nextBefore: 'msg-old' } }]),
    );

    insertSentMessageIntoCache(client, 't-1', buildMessage());

    expect(getData()?.pages[0]?.meta.total).toBe(51);
    // Prepending a NEWER message doesn't change the cursor to the next OLDER
    // page — that still points at whatever the oldest message already was.
    expect(getData()?.pages[0]?.meta.nextBefore).toBe('msg-old');
  });

  it('leaves older pages untouched', () => {
    const page1 = {
      data: [buildMessage({ id: 'msg-old' })],
      meta: { total: 51, limit: 50, nextBefore: 'msg-old' },
    };
    const page2 = {
      data: [buildMessage({ id: 'msg-ancient' })],
      meta: { total: 51, limit: 50, nextBefore: null },
    };
    const { client, getData } = withMockClient(buildCache([page1, page2]));

    insertSentMessageIntoCache(client, 't-1', buildMessage());

    expect(getData()?.pages[1]).toBe(page2);
  });

  it('does nothing when nothing is cached yet', () => {
    // A send racing the very first load. Fabricating a one-page shape here
    // would risk disagreeing with the real fetch's `limit`.
    const { client, getData } = withMockClient(undefined);

    insertSentMessageIntoCache(client, 't-1', buildMessage());

    expect(getData()).toBeUndefined();
  });

  it('is idempotent: a duplicate id is not inserted twice', () => {
    // A refetch landing between the POST resolving and this call running
    // would otherwise leave a visible duplicate row.
    const existing = buildMessage({ id: 'msg-new', content: 'already here' });
    const { client, getData } = withMockClient(
      buildCache([{ data: [existing], meta: { total: 1, limit: 50, nextBefore: null } }]),
    );

    insertSentMessageIntoCache(client, 't-1', buildMessage({ content: 'incoming duplicate' }));

    const page = getData()?.pages[0];
    expect(page?.data).toHaveLength(1);
    expect(page?.data[0]?.content).toBe('already here');
  });

  it('writes to the key the thread page actually reads, scoped to the thread', () => {
    const setQueryData = vi.fn();
    const client = { setQueryData } as unknown as QueryClient;

    insertSentMessageIntoCache(client, 't-42', buildMessage());

    expect(setQueryData.mock.calls[0]?.[0]).toEqual(queryKeys.threads.messagesInfinite('t-42'));
  });
});
