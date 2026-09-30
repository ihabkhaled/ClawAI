import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ComposerQuoteChips } from '@/components/chat/composer-quote-chips';
import { MessageQuotes } from '@/components/chat/message-quotes';
import { SelectionQuoteButton } from '@/components/chat/selection-quote-button';
import { MessageRole } from '@/enums';

describe('ComposerQuoteChips', () => {
  it('renders nothing without quotes', () => {
    const { container } = render(
      <ComposerQuoteChips quotes={[]} onRemove={vi.fn()} heading="Quotes" removeLabel="Remove" />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('lists each quote and removes the one asked for', () => {
    const onRemove = vi.fn();
    render(
      <ComposerQuoteChips
        quotes={[
          { key: 'k1', sourceMessageId: 'm-1', text: 'Day 2: Louvre' },
          { key: 'k2', sourceMessageId: 'm-1', text: 'Day 3: Versailles' },
        ]}
        onRemove={onRemove}
        heading="Quotes"
        removeLabel="Remove quote"
      />,
    );

    expect(screen.getByRole('list', { name: 'Quotes' })).toBeInTheDocument();
    const second = screen.getAllByRole('button', { name: 'Remove quote' })[1];
    if (second === undefined) {
      throw new Error('missing button');
    }
    fireEvent.click(second);
    expect(onRemove).toHaveBeenCalledWith('k2');
  });
});

describe('SelectionQuoteButton', () => {
  it('renders nothing without a selection', () => {
    const { container } = render(
      <SelectionQuoteButton selection={null} onQuote={vi.fn()} label="Quote" />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('keeps the selection alive on press and quotes on click', () => {
    const onQuote = vi.fn();
    render(
      <SelectionQuoteButton
        selection={{ sourceMessageId: 'm-1', text: 'x', top: 10, left: 20 }}
        onQuote={onQuote}
        label="Quote"
      />,
    );
    const button = screen.getByRole('button', { name: 'Quote' });

    // A default mousedown would collapse the selection before the click reads it.
    expect(fireEvent.mouseDown(button)).toBe(false);
    fireEvent.click(button);
    expect(onQuote).toHaveBeenCalledTimes(1);
    expect(button).toHaveStyle({ top: '10px', left: '20px' });
  });
});

describe('MessageQuotes', () => {
  it('shows what a turn replied to', () => {
    render(
      <MessageQuotes
        quotes={[
          { sourceMessageId: 'm-1', sourceRole: MessageRole.ASSISTANT, text: 'Day 2: Louvre' },
        ]}
        label="Replying to"
      />,
    );

    expect(screen.getByRole('list', { name: 'Replying to' })).toHaveTextContent('Day 2: Louvre');
  });
});
