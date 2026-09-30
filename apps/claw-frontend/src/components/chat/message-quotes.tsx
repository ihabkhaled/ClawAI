import { Quote } from 'lucide-react';

import type { MessageQuotesProps } from '@/types';

/**
 * What a user turn was replying to, shown above its text. The quoted words are
 * stored with the turn, so they stay readable even if the source message is
 * later edited away or the thread is rewound.
 */
export function MessageQuotes({ quotes, label }: MessageQuotesProps): React.ReactElement | null {
  if (quotes.length === 0) {
    return null;
  }
  return (
    <ul aria-label={label} className="flex flex-col gap-1">
      {quotes.map((quote) => (
        <li
          key={`${quote.sourceMessageId}:${quote.text}`}
          className="text-muted-foreground border-primary/40 flex min-w-0 items-start gap-1.5 border-s-2 ps-2 text-xs"
        >
          <Quote className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
          <span className="line-clamp-3 min-w-0 break-words">{quote.text}</span>
        </li>
      ))}
    </ul>
  );
}
