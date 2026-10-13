import Link from 'next/link';
import type { ReactElement } from 'react';

import { EntityTable } from '@/components/observability/pages/entity-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DetailSplitsProps } from '@/types/observability-pages.types';
import { formatCount } from '@/utilities/observability-explorer.utility';
import { usersHref } from '@/utilities/observability-pages.utility';

/**
 * The tables under a detail page: the models of a provider (or the provider
 * spellings of a model), the top users with a link to every user, and the plan
 * and surface splits. Fixed order, so their headers are plain text.
 */
export function DetailSplits({
  detail,
  provider,
  model,
  sharedQuery,
  onOpenUser,
  t,
}: DetailSplitsProps): ReactElement {
  const usersFilter = model === null ? { provider } : { provider, model };
  const blocks = [
    {
      key: 'models',
      kind: 'models' as const,
      title: t('observabilityPages.detailModels'),
      rows: detail.models,
    },
    {
      key: 'providers',
      kind: 'providers' as const,
      title: t('observabilityPages.detailProviders'),
      rows: detail.providers,
    },
    {
      key: 'plans',
      kind: 'plans' as const,
      title: t('observabilityPages.detailPlans'),
      rows: detail.plans,
    },
    {
      key: 'workflows',
      kind: 'workflows' as const,
      title: t('observabilityPages.detailSurfaces'),
      rows: detail.workflows,
    },
  ].filter((block) => block.rows.length > 0);

  return (
    <div className="space-y-6">
      <Card className="min-w-0">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-base">{t('observabilityPages.detailTopUsers')}</CardTitle>
          <Link
            href={usersHref(sharedQuery, usersFilter)}
            className="text-primary focus-visible:ring-ring rounded-sm text-sm font-medium underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
          >
            {t('observabilityPages.viewAll')} (
            {formatCount(detail.entity.metrics.distinctUsers ?? 0)})
          </Link>
        </CardHeader>
        <CardContent>
          {detail.users.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t('usageAnalytics.empty')}</p>
          ) : (
            <EntityTable
              kind="users"
              rows={detail.users}
              sort=""
              order="desc"
              compact
              onOpenUser={onOpenUser}
              sharedQuery={sharedQuery}
              t={t}
            />
          )}
        </CardContent>
      </Card>

      {blocks.map((block) => (
        <Card key={block.key} className="min-w-0">
          <CardHeader>
            <CardTitle className="text-base">{block.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <EntityTable
              kind={block.kind}
              rows={block.rows}
              sort=""
              order="desc"
              compact
              onOpenUser={onOpenUser}
              sharedQuery={sharedQuery}
              t={t}
            />
          </CardContent>
        </Card>
      ))}

      {detail.truncated ? (
        <p role="status" className="text-muted-foreground text-sm">
          {t('observabilityPages.detailTruncated')}
        </p>
      ) : null}
    </div>
  );
}
