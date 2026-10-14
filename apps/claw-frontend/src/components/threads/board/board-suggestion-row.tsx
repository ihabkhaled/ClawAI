import type { ReactElement } from 'react';

import { useTranslation } from '@/lib/i18n';
import type { BoardSuggestionRowProps } from '@/types/thread-board-search.types';
import { formatBoardDate, formatBoardType } from '@/utilities/board-highlight.utility';
import { fuzzyHighlightRanges } from '@/utilities/thread-board-fuzzy-highlight.utility';
import { boardTypeLabelKey } from '@/utilities/thread-board-view.utility';

import { HighlightedText } from './highlighted-text';

export function BoardSuggestionRow({
  id,
  suggestion,
  query,
  active,
  onSelect,
  onHover,
}: BoardSuggestionRowProps): ReactElement {
  const { t } = useTranslation();
  const typeKey = boardTypeLabelKey(suggestion.publicationType);
  const ranges =
    suggestion.match.length > 0 ? suggestion.match : fuzzyHighlightRanges(suggestion.title, query);
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
        <HighlightedText text={suggestion.title} ranges={ranges} />
      </span>
      <span className="text-muted-foreground flex items-center gap-2 text-xs">
        <span className="rounded border px-1 uppercase">{suggestion.contentLocale}</span>
        <span>{typeKey ? t(typeKey) : formatBoardType(suggestion.publicationType)}</span>
        <span>{formatBoardDate(suggestion.publishedAt, suggestion.contentLocale)}</span>
      </span>
    </div>
  );
}
