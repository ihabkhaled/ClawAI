// Renders a string with case-insensitive matches of `query` wrapped in a
// theme-aware `<mark>` so the user can spot the substring that triggered a
// search result. The wrapper element is a `<span>` to keep the output inline
// — it stays compatible with `<button>` / `<a>` / `<p>` parents without
// triggering "div inside p" hydration warnings.
import { useMemo } from 'react';

import { cn } from '@/lib/utils';
import type { HighlightedTextProps } from '@/types';
import { splitHighlightSegments } from '@/utilities';

export function HighlightedText({ text, query, className }: HighlightedTextProps): React.ReactElement {
  const segments = useMemo(() => splitHighlightSegments(text, query), [text, query]);
  return (
    <span className={className}>
      {segments.map((segment) => {
        // Stable key. Each segment carries its byte offset inside the
        // original haystack — offsets are unique per segment, so this is
        // collision-free even when the same word repeats in the string.
        const key = `${segment.start}-${segment.isMatch ? 'm' : 't'}`;
        if (segment.isMatch) {
          return (
            <mark
              key={key}
              className={cn(
                'rounded-sm bg-primary/20 px-0.5 text-foreground',
                'dark:bg-primary/30',
              )}
            >
              {segment.text}
            </mark>
          );
        }
        return <span key={key}>{segment.text}</span>;
      })}
    </span>
  );
}
