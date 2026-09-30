'use client';

import { Quote } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { SelectionQuoteButtonProps } from '@/types';

/**
 * A small "Quote" button floating above a text selection inside a message.
 *
 * `onMouseDown` is cancelled so pressing the button does not collapse the
 * selection before the click reads it. Position comes from the selection's
 * rectangle, so it is the one inline style here.
 */
export function SelectionQuoteButton({
  selection,
  onQuote,
  label,
}: SelectionQuoteButtonProps): React.ReactElement | null {
  if (selection === null) {
    return null;
  }
  return (
    <Button
      type="button"
      size="sm"
      variant="secondary"
      className="shadow-soft fixed z-50 h-8 -translate-x-1/2 px-3 text-xs rtl:translate-x-1/2"
      style={{ top: selection.top, left: selection.left }}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onQuote}
    >
      <Quote className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </Button>
  );
}
