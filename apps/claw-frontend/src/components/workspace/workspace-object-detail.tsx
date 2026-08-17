'use client';

import { ExternalLink, RefreshCw } from 'lucide-react';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { WorkspaceObjectDetailProps, WorkspaceObjectLink } from '@/types';
import { formatDate } from '@/utilities/date.utility';

// A sourceLink's related object is its (possibly unresolved) targetObjectId
// — this object referenced something else. A targetLink's related object is
// always its sourceObjectId — something else referenced this object, and
// that reference is by definition already resolved (it's an FK to a row
// that exists).
function OutgoingLinkRow({
  link,
  t,
}: {
  link: WorkspaceObjectLink;
  t: WorkspaceObjectDetailProps['t'];
}): React.ReactElement {
  return (
    <div className="flex items-center justify-between gap-2 rounded border p-2 text-xs">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-xs">
          {link.linkType}
        </Badge>
        {link.targetObjectId !== null ? (
          <Link href={`/workspace/objects/${link.targetObjectId}`} className="hover:text-primary">
            {t('workspaceObjectDetail.viewRelatedItem')}
          </Link>
        ) : (
          <span className="text-muted-foreground">
            {link.externalRef ?? t('workspaceObjectDetail.unresolvedReference')}
          </span>
        )}
      </div>
      <span className="text-muted-foreground">
        {t('workspaceObjectDetail.linkConfidence', { value: link.confidence.toFixed(2) })}
      </span>
    </div>
  );
}

function IncomingLinkRow({
  link,
  t,
}: {
  link: WorkspaceObjectLink;
  t: WorkspaceObjectDetailProps['t'];
}): React.ReactElement {
  return (
    <div className="flex items-center justify-between gap-2 rounded border p-2 text-xs">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-xs">
          {link.linkType}
        </Badge>
        <Link href={`/workspace/objects/${link.sourceObjectId}`} className="hover:text-primary">
          {t('workspaceObjectDetail.viewRelatedItem')}
        </Link>
      </div>
      <span className="text-muted-foreground">
        {t('workspaceObjectDetail.linkConfidence', { value: link.confidence.toFixed(2) })}
      </span>
    </div>
  );
}

export function WorkspaceObjectDetail({
  object,
  isRefreshing,
  refreshError,
  onRefresh,
  t,
}: WorkspaceObjectDetailProps): React.ReactElement {
  const metadataEntries = Object.entries(object.metadata ?? {});
  const sourceLinks = object.sourceLinks ?? [];
  const targetLinks = object.targetLinks ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-base">{object.title}</CardTitle>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant="outline">{object.provider}</Badge>
            <Badge variant="outline">{object.type}</Badge>
            {object.authorId !== null ? (
              <span className="text-muted-foreground text-xs">
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
            <div className="text-muted-foreground mb-1 text-xs font-medium uppercase">
              {t('workspaceObjectDetail.content')}
            </div>
            <p className="bg-muted/50 rounded p-3 text-sm whitespace-pre-wrap">{object.content}</p>
          </div>
        ) : null}

        {metadataEntries.length > 0 ? (
          <div>
            <div className="text-muted-foreground mb-1 text-xs font-medium uppercase">
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

        {sourceLinks.length > 0 || targetLinks.length > 0 ? (
          <div>
            <div className="text-muted-foreground mb-1 text-xs font-medium uppercase">
              {t('workspaceObjectDetail.relatedItems')}
            </div>
            <div className="flex flex-col gap-1">
              {sourceLinks.map((link) => (
                <OutgoingLinkRow key={link.id} link={link} t={t} />
              ))}
              {targetLinks.map((link) => (
                <IncomingLinkRow key={link.id} link={link} t={t} />
              ))}
            </div>
          </div>
        ) : null}

        <div className="text-muted-foreground grid grid-cols-2 gap-3 text-xs">
          <div>
            <div className="uppercase">{t('workspaceObjectDetail.externalCreated')}</div>
            <div className="text-foreground font-medium">
              {object.externalCreatedAt !== null ? formatDate(object.externalCreatedAt) : '—'}
            </div>
          </div>
          <div>
            <div className="uppercase">{t('workspaceObjectDetail.externalUpdated')}</div>
            <div className="text-foreground font-medium">
              {object.externalUpdatedAt !== null ? formatDate(object.externalUpdatedAt) : '—'}
            </div>
          </div>
        </div>

        {object.url !== null ? (
          <a
            href={object.url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary inline-flex items-center gap-1 text-sm"
          >
            {t('workspaceObjectDetail.openInProvider')}
            <ExternalLink className="size-3" />
          </a>
        ) : null}

        {refreshError !== null ? (
          <p className="border-destructive/40 bg-destructive/10 text-destructive rounded border p-2 text-xs">
            {refreshError.message}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
