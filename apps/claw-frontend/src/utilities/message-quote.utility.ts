import {
  QUOTE_BUTTON_OFFSET_PX,
  QUOTE_MAX_TEXT_LENGTH,
  QUOTE_SOURCE_ATTRIBUTE,
} from '@/constants/chat-quote.constants';
import type { ComposerQuote, MessageQuote, MessageQuoteRequest, QuotableSelection } from '@/types';

/** One key per source + text, so selecting the same words twice adds one quote. */
export function quoteKey(sourceMessageId: string, text: string): string {
  return `${sourceMessageId}\u0000${text}`;
}

/** Trims and bounds quoted text to what the server accepts. */
export function clampQuoteText(text: string): string {
  return text.trim().slice(0, QUOTE_MAX_TEXT_LENGTH).trim();
}

/** The quotable message element a DOM node sits inside, if any. */
export function quoteSourceOf(node: Node | null): Element | null {
  const element = node instanceof Element ? node : (node?.parentElement ?? null);
  return element?.closest(`[${QUOTE_SOURCE_ATTRIBUTE}]`) ?? null;
}

/**
 * The current selection, if it is quotable: non-empty, and wholly inside ONE
 * message. A selection spanning two messages has no single source to cite, so
 * it is not offered — provenance is the point of a quote.
 */
export function readQuotableSelection(selection: Selection | null): QuotableSelection | null {
  if (selection === null || selection.isCollapsed || selection.rangeCount === 0) {
    return null;
  }
  const source = quoteSourceOf(selection.anchorNode);
  if (source === null || source !== quoteSourceOf(selection.focusNode)) {
    return null;
  }
  const sourceMessageId = source.getAttribute(QUOTE_SOURCE_ATTRIBUTE);
  const text = clampQuoteText(selection.toString());
  if (sourceMessageId === null || sourceMessageId.length === 0 || text.length === 0) {
    return null;
  }
  const rect = selection.getRangeAt(0).getBoundingClientRect();
  return {
    sourceMessageId,
    text,
    top: Math.max(rect.top - QUOTE_BUTTON_OFFSET_PX, 0),
    left: rect.left + rect.width / 2,
  };
}

/** Quotes stored on a user message's metadata; tolerant of odd JSON. */
export function quotesOfMessage(
  metadata: Record<string, unknown> | null | undefined,
): MessageQuote[] {
  const quotes = metadata?.['quotes'];
  if (!Array.isArray(quotes)) {
    return [];
  }
  return quotes.filter(
    (quote): quote is MessageQuote =>
      typeof quote === 'object' &&
      quote !== null &&
      typeof (quote as MessageQuote).text === 'string' &&
      typeof (quote as MessageQuote).sourceMessageId === 'string',
  );
}

/** The request field for waiting quotes — absent, not empty, when there are none. */
export function toQuoteRequest(quotes: readonly ComposerQuote[] | undefined): {
  quotes?: MessageQuoteRequest[];
} {
  if (quotes === undefined || quotes.length === 0) {
    return {};
  }
  return { quotes: quotes.map(({ sourceMessageId, text }) => ({ sourceMessageId, text })) };
}
