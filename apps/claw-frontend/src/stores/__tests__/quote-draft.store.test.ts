import { beforeEach, describe, expect, it } from 'vitest';

import { useQuoteDraftStore } from '@/stores/quote-draft.store';

const state = () => useQuoteDraftStore.getState();

describe('quote draft store', () => {
  beforeEach(() => {
    useQuoteDraftStore.setState({ byThread: {} });
  });

  it('adds a quote to its own thread only', () => {
    state().addQuote('t-1', { sourceMessageId: 'm-1', text: 'a' });

    expect(state().byThread['t-1']).toHaveLength(1);
    expect(state().byThread['t-2']).toBeUndefined();
  });

  it('adds the same selection once', () => {
    state().addQuote('t-1', { sourceMessageId: 'm-1', text: 'a' });
    state().addQuote('t-1', { sourceMessageId: 'm-1', text: ' a ' });

    expect(state().byThread['t-1']).toHaveLength(1);
  });

  it('stops at three and says so', () => {
    for (const text of ['a', 'b', 'c']) {
      state().addQuote('t-1', { sourceMessageId: 'm', text });
    }

    expect(state().addQuote('t-1', { sourceMessageId: 'm', text: 'd' })).toBe(false);
    expect(state().byThread['t-1']).toHaveLength(3);
  });

  it('removes one quote and clears a thread', () => {
    state().addQuote('t-1', { sourceMessageId: 'm', text: 'a' });
    state().addQuote('t-1', { sourceMessageId: 'm', text: 'b' });
    const key = state().byThread['t-1']?.[0]?.key ?? '';

    state().removeQuote('t-1', key);
    expect(state().byThread['t-1']?.map((quote) => quote.text)).toEqual(['b']);

    state().clearQuotes('t-1');
    expect(state().byThread['t-1']).toBeUndefined();
  });
});
