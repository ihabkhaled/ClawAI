import { describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/repositories/shared/query-keys';
import { invalidateThreadMessages } from '@/utilities/invalidate-thread-messages.utility';

// TanStack matches an invalidation against a query key by array prefix. These
// tests encode that rule directly, because the bug this fixes was invisible at
// every other level: the mutations ran, the invalidations ran, and nothing was
// invalidated.
function prefixMatches(invalidationKey: readonly unknown[], queryKey: readonly unknown[]): boolean {
  return invalidationKey.every((segment, index) => queryKey[index] === segment);
}

describe('thread message cache keys', () => {
  it('proves the two namespaces do NOT match each other', () => {
    // If this ever starts passing as a match, the two-invalidation helper is
    // redundant and should be simplified — but until then it is required.
    expect(
      prefixMatches(
        queryKeys.threads.messagesAnyPage('t-1'),
        queryKeys.threads.messagesInfinite('t-1'),
      ),
    ).toBe(false);
    expect(
      prefixMatches(
        queryKeys.threads.messagesInfinite('t-1'),
        queryKeys.threads.messages('t-1', 1),
      ),
    ).toBe(false);
  });

  it('proves the OLD invalidation key matched neither view — the actual bug', () => {
    // `threads.messages(id)` puts `undefined` in the page slot, so it matches
    // neither the infinite key the thread page reads nor `page: 1` that the
    // orchestration pages read. Send, regenerate and feedback all used it.
    const old = queryKeys.threads.messages('t-1');

    expect(prefixMatches(old, queryKeys.threads.messagesInfinite('t-1'))).toBe(false);
    expect(prefixMatches(old, queryKeys.threads.messages('t-1', 1))).toBe(false);
  });

  it('matches every paginated view with the any-page prefix', () => {
    const anyPage = queryKeys.threads.messagesAnyPage('t-1');

    for (const page of [1, 2, 7]) {
      expect(prefixMatches(anyPage, queryKeys.threads.messages('t-1', page))).toBe(true);
    }
  });

  it('does not reach across threads', () => {
    expect(
      prefixMatches(queryKeys.threads.messagesAnyPage('t-1'), queryKeys.threads.messages('t-2', 1)),
    ).toBe(false);
  });
});

describe('invalidateThreadMessages', () => {
  it('invalidates both views, because one is never enough', () => {
    const invalidateQueries = vi.fn();
    invalidateThreadMessages({ invalidateQueries } as never, 't-1');

    expect(invalidateQueries).toHaveBeenCalledTimes(2);
    const keys = invalidateQueries.mock.calls.map((call) => call[0].queryKey);
    expect(keys).toContainEqual(queryKeys.threads.messagesInfinite('t-1'));
    expect(keys).toContainEqual(queryKeys.threads.messagesAnyPage('t-1'));
  });
});
