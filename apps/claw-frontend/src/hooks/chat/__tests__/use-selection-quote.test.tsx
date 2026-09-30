import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { useSelectionQuote } from '@/hooks/chat/use-selection-quote';
import { useQuoteDraftStore } from '@/stores/quote-draft.store';

const mockToastError = vi.fn();

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ locale: 'en', t: (key: string) => key }),
}));
vi.mock('@/utilities', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, showToast: { error: (...args: unknown[]) => mockToastError(...args) } };
});

function selectInMessage(messageId: string, text: string): void {
  const root = document.createElement('div');
  root.setAttribute('data-quote-source-id', messageId);
  root.textContent = text;
  document.body.appendChild(root);
  const node = root.firstChild;
  if (node === null) {
    throw new Error('no text');
  }
  const range = document.createRange();
  range.setStart(node, 0);
  range.setEnd(node, text.length);
  const selection = document.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
  document.dispatchEvent(new Event('selectionchange'));
}

// jsdom has no layout, so Range#getBoundingClientRect does not exist there;
// every real browser has it. A fixed rectangle is enough for these tests.
beforeAll(() => {
  if (typeof Range.prototype.getBoundingClientRect !== 'function') {
    Range.prototype.getBoundingClientRect = () => new DOMRect(100, 200, 40, 16);
  }
});

describe('useSelectionQuote', () => {
  beforeEach(() => {
    useQuoteDraftStore.setState({ byThread: {} });
    mockToastError.mockReset();
  });

  afterEach(() => {
    document.getSelection()?.removeAllRanges();
    document.body.innerHTML = '';
  });

  it('offers the selection and quotes it into this thread', () => {
    const { result } = renderHook(() => useSelectionQuote('t-1'));

    act(() => selectInMessage('m-9', 'Day 2: Louvre'));
    expect(result.current.selection?.sourceMessageId).toBe('m-9');

    act(() => result.current.onQuote());

    expect(useQuoteDraftStore.getState().byThread['t-1']?.[0]?.text).toBe('Day 2: Louvre');
    expect(result.current.selection).toBeNull();
  });

  it('says so when the thread already holds three quotes', () => {
    for (const text of ['a', 'b', 'c']) {
      useQuoteDraftStore.getState().addQuote('t-1', { sourceMessageId: 'm', text });
    }
    const { result } = renderHook(() => useSelectionQuote('t-1'));

    act(() => selectInMessage('m-9', 'one more'));
    act(() => result.current.onQuote());

    expect(mockToastError).toHaveBeenCalledWith({ description: 'chat.quote.limitReached' });
    expect(useQuoteDraftStore.getState().byThread['t-1']).toHaveLength(3);
  });

  it('removes its listeners on unmount', () => {
    const remove = vi.spyOn(document, 'removeEventListener');
    const { unmount } = renderHook(() => useSelectionQuote('t-1'));

    unmount();

    expect(remove).toHaveBeenCalledWith('selectionchange', expect.any(Function));
    remove.mockRestore();
  });
});
