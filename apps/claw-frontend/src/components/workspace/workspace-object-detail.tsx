'use client';

import { ExternalLink, RefreshCw } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { WorkspaceObjectDetailProps } from '@/types';
import { formatDate } from '@/utilities/date.utility';

export function WorkspaceObjectDetail({
  object,
  isRefreshing,
  refreshError,
  onRefresh,
  t,
}: WorkspaceObjectDetailProps): React.ReactElement {
  const metadataEntries = Object.entries(object.metadata ?? {});

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-base">{object.title}</CardTitle>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant="outline">{object.provider}</Badge>
            <Badge variant="outline">{object.type}</Badge>
            {object.authorId !== null ? (
              <span className="text-xs text-muted-foreground">
                {t('workspaceObjectDetail.author', { author: object.authorId })}
              </span>
            ) : null}
          </div>
        </div>
        <Button variant="outline" size="sm" disabled={isRefreshing} onClick={onRefresh}>
          <RefreshCw className={isRefreshing ? 'size-4 animate-spin' : 'size-4'} />
          <span className="ms-2">{t('workspaceObjectDetail.refresh')}</span>
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 text-sm">
        {object.content !== null ? (
          <div>
            <div className="mb-1 text-xs font-medium uppercase text-muted-foreground">
              {t('workspaceObjectDetail.content')}
            </div>
            <p className="whitespace-pre-wrap rounded bg-muted/50 p-3 text-sm">{object.content}</p>
          </div>
        ) : null}

        {metadataEntries.length > 0 ? (
          <div>
            <div className="mb-1 text-xs font-medium uppercase text-muted-foreground">
              {t('workspaceObjectDetail.metadata')}
            </div>
            <dl className="grid grid-cols-2 gap-2 text-xs">
              {metadataEntries.map(([key, value]) => (
                <div key={key} className="rounded border p-2">
                  <dt className="text-muted-foreground">{key}</dt>
                  <dd className="font-medium">{String(value)}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
          <div>
            <div className="uppercase">{t('workspaceObjectDetail.externalCreated')}</div>
            <div className="font-medium text-foreground">
              {object.externalCreatedAt !== null ? formatDate(object.externalCreatedAt) : '—'}
            </div>
          </div>
          <div>
            <div className="uppercase">{t('workspaceObjectDetail.externalUpdated')}</div>
            <div className="font-medium text-foreground">
              {object.externalUpdatedAt !== null ? formatDate(object.externalUpdatedAt) : '—'}
            </div>
          </div>
        </div>

        {object.url !== null ? (
          <a
            href={object.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm hover:text-primary"
          >
            {t('workspaceObjectDetail.openInProvider')}
            <ExternalLink className="size-3" />
          </a>
        ) : null}

        {refreshError !== null ? (
          <p className="rounded border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
            {refreshError.message}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
