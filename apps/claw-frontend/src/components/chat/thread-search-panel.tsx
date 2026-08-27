'use client';

import { Search, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageRole } from '@/enums';
import { ThreadSearchState } from '@/enums/thread-search-state.enum';
import { useTranslation } from '@/lib/i18n';
import type { ThreadSearchPanelProps } from '@/types/component.types';
import { resolveThreadSearchState } from '@/utilities/thread-search-state.utility';

/**
 * Find-in-conversation, with jump-to.
 *
 * A long thread is exactly where scrolling stops working, and the browser's own
 * find cannot help: the message list is virtualised, so most of the
 * conversation is not in the DOM to be found.
 *
 * Results are snippets cut around the match rather than message openings — in a
 * thread of similar prompts, openings make every result look identical.
 */
export function ThreadSearchPanel({
  search,
  onJumpToMessage,
}: ThreadSearchPanelProps): React.ReactElement | null {
  const { t } = useTranslation();
  const state = resolveThreadSearchState(search);

  if (!search.isOpen) {
    return null;
  }

  return (
    <section
      className="border-border bg-card mx-auto w-full max-w-3xl rounded-lg border p-3"
      aria-label={t('chat.search.title')}
    >
      <div className="flex items-center gap-2">
        <Search className="text-muted-foreground h-4 w-4 shrink-0" aria-hidden="true" />
        <Input
          value={search.term}
          onChange={(event) => search.setTerm(event.target.value)}
          placeholder={t('chat.search.placeholder')}
          aria-label={t('chat.search.placeholder')}
          ref={search.inputRef}
        />
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={search.close}
          aria-label={t('chat.search.close')}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {state === ThreadSearchState.TooShort ? (
        <p className="text-muted-foreground mt-2 text-xs">{t('chat.search.keepTyping')}</p>
      ) : null}
      {state === ThreadSearchState.Searching ? (
        <p className="text-muted-foreground mt-2 text-xs">{t('chat.search.searching')}</p>
      ) : null}
      {state === ThreadSearchState.NoMatches ? (
        <p className="text-muted-foreground mt-2 text-xs">{t('chat.search.noMatches')}</p>
      ) : null}
      {state === ThreadSearchState.HasMatches ? (
        <ul className="mt-2 max-h-64 space-y-1 overflow-y-auto">
          {search.matches.map((match) => (
            <li key={match.messageId}>
              <Button
                type="button"
                variant="ghost"
                size="unstyled"
                onClick={() => onJumpToMessage(match.messageId)}
                className="hover:bg-accent focus-visible:ring-ring h-auto w-full justify-start rounded-md px-2 py-1.5 text-start text-xs font-normal whitespace-normal focus-visible:ring-2 focus-visible:outline-none"
              >
                <span className="text-muted-foreground me-2 font-medium">
                  {match.role === MessageRole.USER
                    ? t('chat.search.roleUser')
                    : t('chat.search.roleAssistant')}
                </span>
                <span className="break-words">{match.snippet}</span>
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
