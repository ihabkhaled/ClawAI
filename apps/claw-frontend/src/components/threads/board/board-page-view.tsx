'use client';

import type { ReactElement } from 'react';

import { BoardDidYouMean } from '@/components/threads/board/board-did-you-mean';
import { BoardEmpty } from '@/components/threads/board/board-empty';
import { BoardError } from '@/components/threads/board/board-error';
import { BoardGrid } from '@/components/threads/board/board-grid';
import { BoardGuestBanner } from '@/components/threads/board/board-guest-banner';
import { BoardPagination } from '@/components/threads/board/board-pagination';
import { BoardSkeleton } from '@/components/threads/board/board-skeleton';
import { BoardToolbar } from '@/components/threads/board/board-toolbar';
import { ThreadBoardMode } from '@/enums/thread-board-mode.enum';
import { useBoardMode } from '@/hooks/threads/board/use-board-mode';
import { useBoardPage } from '@/hooks/threads/board/use-board-page';
import { useTranslation } from '@/lib/i18n';
import type { BoardPageViewProps } from '@/types/thread-board-view.types';

export function BoardPageView({ initial }: BoardPageViewProps): ReactElement {
  const { t } = useTranslation();
  const isGuest = useBoardMode() === ThreadBoardMode.Guest;
  const page = useBoardPage(initial);
  const { state, query, meta } = page;
  const showEmpty = !page.isLoading && !page.isError && page.items.length === 0;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 sm:p-6">
      <header className="flex max-w-3xl flex-col gap-1">
        <h1 className="text-2xl font-semibold">
          {isGuest ? t('chat.threadPublicBoardTitle') : t('chat.threadBoardTitle')}
        </h1>
        <p className="text-muted-foreground text-sm">
          {isGuest ? t('chat.threadPublicBoardIntro') : t('chat.threadBoardSubtitle')}
        </p>
      </header>
      {isGuest ? <BoardGuestBanner /> : null}
      <BoardToolbar
        q={state.q}
        sort={state.sort}
        lang={state.lang}
        type={state.type}
        total={page.items.length > 0 ? (meta?.total ?? 0) : 0}
        chips={page.chips}
        hasActiveFilters={query.hasActiveFilters}
        activeFilterCount={page.activeFilterCount}
        onSearch={query.setQuery}
        onSort={page.changeSort}
        onLanguageChange={query.setLanguage}
        onTypeChange={page.changeType}
        onRemoveChip={page.removeChip}
        onClear={query.clearFilters}
      />
      {page.didYouMean ? (
        <BoardDidYouMean
          term={page.didYouMean}
          onSelect={() => query.setQuery(page.didYouMean ?? '')}
        />
      ) : null}
      {page.isLoading ? <BoardSkeleton /> : null}
      {page.isError ? <BoardError onRetry={page.retry} rateLimit={page.rateLimit} /> : null}
      {showEmpty ? (
        <BoardEmpty
          query={state.q.trim()}
          hasQuery={state.q.trim() !== ''}
          hasActiveFilters={query.hasActiveFilters}
          onClear={query.clearFilters}
        />
      ) : null}
      {page.items.length > 0 ? <BoardGrid items={page.items} /> : null}
      {meta ? (
        <BoardPagination
          page={state.page}
          limit={meta.limit}
          total={meta.total}
          totalPages={meta.totalPages}
          onPageChange={query.setPage}
        />
      ) : null}
    </div>
  );
}
