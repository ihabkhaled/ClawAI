import type { ReactElement } from 'react';

import type { BoardSuggestionRowProps } from '@/types/thread-board-search.types';
import { formatBoardDate, formatBoardType } from '@/utilities/board-highlight.utility';

import { HighlightedText } from './highlighted-text';

export function BoardSuggestionRow({
  id,
  suggestion,
  active,
  onSelect,
  onHover,
}: BoardSuggestionRowProps): ReactElement {
  return (
    <div
      id={id}
      role="option"
      aria-selected={active}
      tabIndex={-1}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          onSelect();
        }
      }}
      onClick={onSelect}
      onMouseEnter={onHover}
      className={`flex min-h-11 cursor-pointer flex-col justify-center gap-0.5 px-3 py-2 text-start ${
        active ? 'bg-accent text-accent-foreground' : ''
      }`}
    >
      <span dir="auto" className="truncate text-sm font-medium">
        <HighlightedText text={suggestion.title} ranges={suggestion.match} />
      </span>
      <span className="text-muted-foreground flex items-center gap-2 text-xs">
        <span className="rounded border px-1 uppercase">{suggestion.contentLocale}</span>
        <span>{formatBoardType(suggestion.publicationType)}</span>
        <span>{formatBoardDate(suggestion.publishedAt, suggestion.contentLocale)}</span>
      </span>
    </div>
  );
}
