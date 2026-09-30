import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import {
  clampQuoteText,
  quoteKey,
  quotesOfMessage,
  readQuotableSelection,
  toQuoteRequest,
} from '@/utilities/message-quote.utility';

function mount(html: string): HTMLElement {
  const root = document.createElement('div');
  root.innerHTML = html;
  document.body.appendChild(root);
  return root;
}

function select(from: Node, fromOffset: number, to: Node, toOffset: number): Selection {
  const selection = document.getSelection();
  if (selection === null) {
    throw new Error('no selection support');
  }
  const range = document.createRange();
  range.setStart(from, fromOffset);
  range.setEnd(to, toOffset);
  selection.removeAllRanges();
  selection.addRange(range);
  return selection;
}

function textIn(root: HTMLElement, index = 0): Text {
  const node = root.querySelectorAll('p')[index]?.firstChild;
  if (!(node instanceof Text)) {
    throw new Error('no text node');
  }
  return node;
}

// jsdom has no layout, so Range#getBoundingClientRect does not exist there;
// every real browser has it. A fixed rectangle is enough for these tests.
beforeAll(() => {
  if (typeof Range.prototype.getBoundingClientRect !== 'function') {
    Range.prototype.getBoundingClientRect = () => new DOMRect(100, 200, 40, 16);
  }
});

describe('readQuotableSelection', () => {
  afterEach(() => {
    document.getSelection()?.removeAllRanges();
    document.body.innerHTML = '';
  });

  it('reads a selection inside one message, with that message as its source', () => {
    const root = mount('<div data-quote-source-id="m-1"><p>Day 2: Louvre and Orsay</p></div>');
    const text = textIn(root);

    const result = readQuotableSelection(select(text, 0, text, 13));

    expect(result).toMatchObject({ sourceMessageId: 'm-1', text: 'Day 2: Louvre' });
  });

  it('refuses a selection spanning two messages, which has no single source', () => {
    const root = mount(
      '<div data-quote-source-id="m-1"><p>first</p></div><div data-quote-source-id="m-2"><p>second</p></div>',
    );

    expect(readQuotableSelection(select(textIn(root, 0), 0, textIn(root, 1), 3))).toBeNull();
  });

  it('refuses text outside any message (the composer, the header)', () => {
    const root = mount('<p>not a message</p>');
    const text = textIn(root);

    expect(readQuotableSelection(select(text, 0, text, 3))).toBeNull();
  });

  it('refuses a whitespace-only or missing selection', () => {
    const root = mount('<div data-quote-source-id="m-1"><p>   </p></div>');
    const text = textIn(root);

    expect(readQuotableSelection(select(text, 0, text, 3))).toBeNull();
    expect(readQuotableSelection(null)).toBeNull();
  });
});

describe('quote helpers', () => {
  it('bounds quoted text to what the server accepts', () => {
    expect(clampQuoteText(`  ${'x'.repeat(2500)}  `)).toHaveLength(2000);
  });

  it('gives the same selection the same key', () => {
    expect(quoteKey('m-1', 'a')).toBe(quoteKey('m-1', 'a'));
    expect(quoteKey('m-1', 'a')).not.toBe(quoteKey('m-2', 'a'));
  });

  it('omits the request field when nothing is quoted, and strips the local key', () => {
    expect(toQuoteRequest(undefined)).toEqual({});
    expect(toQuoteRequest([])).toEqual({});
    expect(toQuoteRequest([{ key: 'k', sourceMessageId: 'm-1', text: 'a' }])).toEqual({
      quotes: [{ sourceMessageId: 'm-1', text: 'a' }],
    });
  });

  it('reads stored quotes and ignores malformed JSON', () => {
    const quote = { sourceMessageId: 'm-1', sourceRole: 'ASSISTANT', text: 'a' };

    expect(quotesOfMessage({ quotes: [quote, { text: 3 }, null] })).toEqual([quote]);
    expect(quotesOfMessage(null)).toEqual([]);
  });
});
