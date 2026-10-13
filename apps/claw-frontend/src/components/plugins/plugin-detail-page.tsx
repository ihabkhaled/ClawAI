'use client';

import { AlertTriangle, ArrowLeft, Puzzle } from 'lucide-react';
import Link from 'next/link';

import { EmptyState } from '@/components/common/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PLUGIN_SOURCE_LABEL_KEYS } from '@/constants/plugins.constants';
import { ROUTES } from '@/constants/routes.constants';
import { EmptyStateVariant } from '@/enums/empty-state-variant.enum';
import { usePluginDetail } from '@/hooks/plugins/use-plugin-detail';
import type { PluginDetailPageProps } from '@/types/plugins.types';
import { categoryLabel } from '@/utilities/plugins.utility';

import { PluginIcon } from './plugin-icon';
import { PluginInstallPanel } from './plugin-install-panel';
import { PluginPermissions } from './plugin-permissions';
import { PluginRiskBadge } from './plugin-risk-badge';
import { PluginToolList } from './plugin-tool-list';

/** One plugin: what it is, the tools it adds, what using it means, and the install control. */
export function PluginDetailPage({ slug }: PluginDetailPageProps): React.ReactElement {
  const { t, plugin, isLoading, isNotFound, isError, retry } = usePluginDetail(slug);

  const back = (
    <Link
      href={ROUTES.PLUGINS}
      className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-2 text-sm"
    >
      <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
      {t('plugins.detail.back')}
    </Link>
  );

  if (isLoading) {
    return (
      <div>
        {back}
        <div className="space-y-4" role="status" aria-label={t('plugins.loading')}>
          <Skeleton className="min-h-16 w-full rounded-xl" />
          <Skeleton className="min-h-40 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (isNotFound) {
    return (
      <div>
        {back}
        <EmptyState
          icon={Puzzle}
          title={t('plugins.detail.notFoundTitle')}
          description={t('plugins.detail.notFoundDescription')}
          variant={EmptyStateVariant.Compact}
        />
      </div>
    );
  }

  if (isError || plugin === undefined) {
    return (
      <div>
        {back}
        <EmptyState
          icon={AlertTriangle}
          title={t('plugins.errorTitle')}
          description={t('plugins.errorDescription')}
          variant={EmptyStateVariant.Compact}
          action={
            <Button variant="outline" size="sm" onClick={retry}>
              {t('common.retry')}
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div>
      {back}
      <header className="mb-6 flex items-start gap-4">
        <span className="bg-muted flex h-14 w-14 shrink-0 items-center justify-center rounded-xl">
          <PluginIcon iconKey={plugin.iconKey} className="h-7 w-7" />
        </span>
        <div className="min-w-0 space-y-2">
          <h1 className="text-2xl font-bold tracking-tight break-words sm:text-3xl">
            {plugin.name}
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">{plugin.summary}</p>
          <div className="flex flex-wrap items-center gap-2">
            <PluginRiskBadge risk={plugin.maxRisk} t={t} />
            <Badge variant="outline">{categoryLabel(t, plugin.category)}</Badge>
            <Badge variant="secondary">{t(PLUGIN_SOURCE_LABEL_KEYS[plugin.source])}</Badge>
            <span className="text-muted-foreground text-xs">
              {t('plugins.detail.publishedBy', { value: plugin.publisher })}
              {' · '}
              {t('plugins.detail.version', { value: plugin.version })}
            </span>
          </div>
          <PluginInstallPanel plugin={plugin} />
        </div>
      </header>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('plugins.detail.aboutTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-line">{plugin.description}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {t('plugins.detail.toolsTitle', { value: plugin.tools.length })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PluginToolList tools={plugin.tools} t={t} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('plugins.detail.permissionsTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            <PluginPermissions plugin={plugin} t={t} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
