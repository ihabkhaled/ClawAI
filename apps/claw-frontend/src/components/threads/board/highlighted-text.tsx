import type { ReactElement } from 'react';

import type { HighlightedTextProps } from '@/types/thread-board-search.types';
import { splitHighlightSegments } from '@/utilities/board-highlight.utility';

/** Renders text as React text nodes with matched runs in <mark>. Never injects HTML. */
export function HighlightedText({ text, ranges }: HighlightedTextProps): ReactElement {
  const segments = splitHighlightSegments(text, ranges);
  return (
    <>
      {segments.map((segment) =>
        segment.match ? (
          <mark
            key={segment.start}
            className="text-foreground rounded-sm bg-yellow-200/70 dark:bg-yellow-500/30"
          >
            {segment.text}
          </mark>
        ) : (
          <span key={segment.start}>{segment.text}</span>
        ),
      )}
    </>
  );
}
