import { Search, X } from 'lucide-react';
import type { ReactElement } from 'react';

import { BoardDidYouMean } from '@/components/threads/board/board-did-you-mean';
import { BoardSuggestionRow } from '@/components/threads/board/board-suggestion-row';
import { Button } from '@/components/ui/button';
import { THREAD_BOARD_MAX_QUERY_LENGTH } from '@/constants/thread-board.constants';
import { useBoardSearchCombobox } from '@/hooks/threads/board/use-board-search-combobox';
import { useTranslation } from '@/lib/i18n';
import type { BoardSearchComboboxProps } from '@/types/thread-board-search.types';

export function BoardSearchCombobox(props: BoardSearchComboboxProps): ReactElement {
  const { t } = useTranslation();
  const c = useBoardSearchCombobox(props);
  const { suggest, panelOpen, keyboard } = c;
  const rows = suggest.suggestions;
  const showLoading = panelOpen && suggest.isLoading && rows.length === 0;
  const showError = panelOpen && suggest.isError && !showLoading;
  const showEmpty = panelOpen && !suggest.isLoading && !suggest.isError && rows.length === 0;
  const showAllActive = keyboard.activeIndex === keyboard.showAllIndex;

  return (
    <div ref={c.containerRef} className="relative w-full" data-testid="board-search-combobox">
      <Search
        aria-hidden="true"
        className="text-muted-foreground pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2"
      />
      <input
        type="text"
        role="combobox"
        dir="auto"
        maxLength={THREAD_BOARD_MAX_QUERY_LENGTH}
        aria-label={t('chat.threadBoardSearchLabel')}
        aria-autocomplete="list"
        aria-haspopup="listbox"
        aria-expanded={panelOpen}
        aria-controls={panelOpen && rows.length > 0 ? c.listId : undefined}
        aria-activedescendant={panelOpen ? keyboard.activeDescendantId : undefined}
        placeholder={t('chat.threadBoardSearchPlaceholder')}
        value={c.draft}
        onChange={(event) => c.setDraft(event.target.value)}
        onFocus={c.openPanel}
        onKeyDown={keyboard.onKeyDown}
        className="border-input bg-background focus-visible:ring-ring h-11 w-full rounded-md border ps-9 pe-10 text-sm focus-visible:ring-2 focus-visible:outline-none"
      />
      {c.draft ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={t('chat.threadBoardClearFilters')}
          onClick={c.clear}
          className="text-muted-foreground absolute end-1 top-1/2 -translate-y-1/2"
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </Button>
      ) : null}
      <div role="status" aria-live="polite" className="sr-only">
        {panelOpen && !suggest.isLoading && !suggest.isError
          ? t('chat.threadBoardResultsCount', { count: c.totalLabel })
          : ''}
      </div>
      {panelOpen ? (
        <div
          role="presentation"
          onMouseDown={(event) => event.preventDefault()}
          className="bg-popover text-popover-foreground absolute inset-x-0 top-full z-50 mt-1 overflow-hidden rounded-md border shadow-md"
        >
          {suggest.didYouMean ? (
            <BoardDidYouMean term={suggest.didYouMean} onSelect={c.applyDidYouMean} />
          ) : null}
          {showLoading ? (
            <p
              data-testid="board-suggest-loading"
              className="text-muted-foreground px-3 py-3 text-sm"
            >
              …
            </p>
          ) : null}
          {showError ? (
            <p role="alert" className="text-destructive px-3 py-3 text-sm">
              {t('chat.threadBoardErrorTitle')}
            </p>
          ) : null}
          {showEmpty ? (
            <p className="text-muted-foreground px-3 py-3 text-sm">
              {t('chat.threadBoardNoSuggestions')}
            </p>
          ) : null}
          {rows.length > 0 ? (
            <div id={c.listId} role="listbox" aria-label={t('chat.threadBoardSuggestionsLabel')}>
              {rows.map((suggestion, index) => (
                <BoardSuggestionRow
                  key={suggestion.slug}
                  id={keyboard.optionId(index)}
                  suggestion={suggestion}
                  query={c.draft.trim()}
                  active={index === keyboard.activeIndex}
                  onSelect={() => c.selectSuggestion(index)}
                  onHover={() => keyboard.setActiveIndex(index)}
                />
              ))}
              <div
                id={keyboard.optionId(keyboard.showAllIndex)}
                role="option"
                aria-selected={showAllActive}
                tabIndex={-1}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    c.submitDraft();
                  }
                }}
                onClick={c.submitDraft}
                onMouseEnter={() => keyboard.setActiveIndex(keyboard.showAllIndex)}
                className={`flex min-h-11 cursor-pointer items-center border-t px-3 text-sm font-medium ${
                  showAllActive ? 'bg-accent text-accent-foreground' : ''
                }`}
              >
                {`${t('chat.threadBoardShowAll')} (${c.totalLabel})`}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
