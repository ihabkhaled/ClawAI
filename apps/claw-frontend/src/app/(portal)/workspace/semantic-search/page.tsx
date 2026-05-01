'use client';

import type { FormEvent, ReactElement } from 'react';

import { PageHeader } from '@/components/common/page-header';
import { SearchResultCard } from '@/components/search/search-result-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useWorkspaceSearch } from '@/hooks/search/use-workspace-search';
import { useTranslation } from '@/lib/i18n';

export default function WorkspaceSemanticSearchPage(): ReactElement {
  const { t } = useTranslation();
  const { query, setQuery, hits, isSearching, isError, error, embeddingModel, submit, reset } =
    useWorkspaceSearch();

  const handleSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    submit();
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader title={t('search.page.title')} description={t('search.page.description')} />

      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('search.page.placeholder')}
            aria-label={t('search.page.placeholder')}
          />
          <Button type="submit" disabled={isSearching || query.trim().length < 2}>
            {isSearching ? t('search.page.searching') : t('search.page.submit')}
          </Button>
          <Button type="button" variant="ghost" onClick={reset}>
            {t('search.page.reset')}
          </Button>
        </div>
        {embeddingModel !== null ? (
          <p className="text-xs text-muted-foreground">
            {t('search.page.local', { model: embeddingModel })}
          </p>
        ) : null}
      </form>

      {isError ? (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error?.message ?? t('search.page.error')}
        </p>
      ) : null}

      {!isSearching && !isError && hits.length === 0 && query.length > 0 ? (
        <p className="rounded-lg border border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
          {t('search.page.noResults')}
        </p>
      ) : null}

      {hits.length > 0 ? (
        <div className="flex flex-col gap-2">
          {hits.map((hit) => (
            <SearchResultCard key={hit.workspaceObjectId} hit={hit} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
