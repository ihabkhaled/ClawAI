import { ExternalLink, Package } from 'lucide-react';

import { EmptyState } from '@/components/common/empty-state';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { WorkspaceObjectListProps } from '@/types/component.types';

export function WorkspaceObjectList({
  objects,
  isLoading,
  isError,
  t,
}: WorkspaceObjectListProps): React.ReactElement {
  if (isLoading) {
    return <LoadingSpinner label={t('workspaceObjects.loading')} />;
  }

  if (isError) {
    return <p className="text-sm text-destructive">{t('workspaceObjects.loadFailed')}</p>;
  }

  if (objects.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title={t('workspaceObjects.noObjects')}
        description={t('workspaceObjects.noObjectsDesc')}
      />
    );
  }

  return (
    <div className="space-y-2">
      {objects.map((obj) => (
        <Card key={obj.id} className="overflow-hidden">
          <CardContent className="flex items-start justify-between gap-4 p-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="shrink-0 text-xs">
                  {obj.type}
                </Badge>
                <p className="truncate text-sm font-medium">{obj.title}</p>
              </div>
              {obj.content !== null && (
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{obj.content}</p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                {t('workspaceObjects.source')}: {obj.provider}
              </p>
            </div>
            {obj.url !== null && (
              <a
                href={obj.url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-muted-foreground hover:text-foreground"
                aria-label={t('workspaceObjects.viewObject')}
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
