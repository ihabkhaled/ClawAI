'use client';

import { Quote, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { ComposerQuoteChipsProps } from '@/types';

/**
 * The quotes this turn will reply to, above the textarea. Each shows the
 * start of the quoted words and can be dropped before sending. Renders
 * nothing when there are none, so an ordinary composer is unchanged.
 */
export function ComposerQuoteChips({
  quotes,
  onRemove,
  heading,
  removeLabel,
}: ComposerQuoteChipsProps): React.ReactElement | null {
  if (quotes.length === 0) {
    return null;
  }
  return (
    <ul aria-label={heading} className="flex flex-col gap-1 px-1">
      {quotes.map((quote) => (
        <li
          key={quote.key}
          className="bg-muted/60 border-primary/50 flex min-w-0 items-start gap-2 rounded-lg border-s-2 py-1 ps-2 pe-1 text-xs"
        >
          <Quote className="text-muted-foreground mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
          <span className="text-muted-foreground line-clamp-2 min-w-0 flex-1 break-words">
            {quote.text}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="h-6 w-6 shrink-0"
            aria-label={removeLabel}
            title={removeLabel}
            onClick={() => onRemove(quote.key)}
          >
            <X className="h-3 w-3" />
          </Button>
        </li>
      ))}
    </ul>
  );
}
