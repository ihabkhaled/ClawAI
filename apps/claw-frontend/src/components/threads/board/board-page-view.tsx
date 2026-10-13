'use client';

import type { ReactElement } from 'react';

import { BoardDidYouMean } from '@/components/threads/board/board-did-you-mean';
import { BoardEmpty } from '@/components/threads/board/board-empty';
import { BoardError } from '@/components/threads/board/board-error';
import { BoardGrid } from '@/components/threads/board/board-grid';
import { BoardPagination } from '@/components/threads/board/board-pagination';
import { BoardSkeleton } from '@/components/threads/board/board-skeleton';
import { BoardToolbar } from '@/components/threads/board/board-toolbar';
import { useBoardPage } from '@/hooks/threads/board/use-board-page';
import { useTranslation } from '@/lib/i18n';

export function BoardPageView(): ReactElement {
  const { t } = useTranslation();
  const page = useBoardPage();
  const { state, query, meta } = page;
  const showEmpty = !page.isLoading && !page.isError && page.items.length === 0;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 sm:p-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{t('chat.threadBoardTitle')}</h1>
        <p className="text-muted-foreground text-sm">{t('chat.threadBoardSubtitle')}</p>
      </header>
      <BoardToolbar
        q={state.q}
        sort={state.sort}
        lang={state.lang}
        type={state.type}
        total={meta?.total ?? 0}
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
      {page.isError ? <BoardError onRetry={page.retry} /> : null}
      {showEmpty ? (
        <BoardEmpty
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
