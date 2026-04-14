import { ExternalLink, Search } from 'lucide-react';

import { EmptyState } from '@/components/common/empty-state';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { WorkspaceSearchResultsProps } from '@/types/component.types';

export function WorkspaceSearchResults({
  results,
  isLoading,
  isError,
  query,
  t,
}: WorkspaceSearchResultsProps): React.ReactElement {
  if (isLoading) {
    return <LoadingSpinner label={t('workspaceSearch.searching')} />;
  }

  if (isError) {
    return <p className="text-sm text-destructive">{t('workspaceSearch.searchFailed')}</p>;
  }

  if (query.length > 0 && results.length === 0) {
    return (
      <EmptyState
        icon={Search}
        title={t('workspaceSearch.noResults')}
        description={t('workspaceSearch.noResultsDesc')}
      />
    );
  }

  if (results.length === 0) {
    return <div />;
  }

  return (
    <div className="space-y-2">
      {results.map((result) => (
        <Card key={result.id} className="overflow-hidden">
          <CardContent className="flex items-start justify-between gap-4 p-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="shrink-0 text-xs">
                  {result.type}
                </Badge>
                <Badge variant="outline" className="shrink-0 text-xs">
                  {result.provider}
                </Badge>
                <p className="truncate text-sm font-medium">{result.title}</p>
              </div>
              {result.snippet !== null && (
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{result.snippet}</p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                {t('workspaceSearch.score')}: {result.score.toFixed(2)}
              </p>
            </div>
            {result.url !== null && (
              <a
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-muted-foreground hover:text-foreground"
                aria-label={t('workspaceSearch.viewSource')}
              >
                <ExternalLink className="size-4" />
              </a>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
