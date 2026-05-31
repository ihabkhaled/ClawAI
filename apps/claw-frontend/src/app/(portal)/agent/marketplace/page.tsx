'use client';

import { Download, Store } from 'lucide-react';
import type { ReactElement } from 'react';

import { EmptyState } from '@/components/common/empty-state';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { PageHeader } from '@/components/common/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useMarketplacePage } from '@/hooks/agent/use-marketplace-page';
import { useTranslation } from '@/lib/i18n';

export default function AgentMarketplacePage(): ReactElement {
  const { t } = useTranslation();
  const { listings, total, isLoading, isError, error, handleInstall, isInstalling } =
    useMarketplacePage();

  if (isError) {
    return (
      <div>
        <PageHeader title={t('agent.marketplace')} description={t('agent.marketplaceDesc')} />
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-destructive">
            {error instanceof Error ? error.message : t('agent.loadFailed')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('agent.marketplace')}
        description={t('agent.marketplaceDesc')}
        actions={<span className="text-xs text-muted-foreground">{total} listed</span>}
      />

      {isLoading && <LoadingSpinner label={t('agent.loading')} />}

      {!isLoading && listings.length === 0 && (
        <EmptyState
          icon={Store}
          title={t('agent.noListings')}
          description={t('agent.noListingsDesc')}
        />
      )}

      {!isLoading && listings.length > 0 && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {listings.map((l) => (
            <Card key={l.id}>
              <CardContent className="flex flex-col gap-2 py-3">
                <div className="flex items-center gap-2">
                  <Store className="size-4 text-muted-foreground" />
                  <span className="text-sm font-semibold">{l.name}</span>
                  <Badge variant="outline" className="ml-auto text-xs">
                    {l.installs} installs
                  </Badge>
                </div>
                {l.description !== null && (
                  <p className="line-clamp-2 text-xs text-muted-foreground">{l.description}</p>
                )}
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs">
                    {l.dsl.steps.length} steps
                  </Badge>
                  <Badge variant="outline" className="font-mono text-xs">
                    {l.signatureAlgorithm}
                  </Badge>
                  <button
                    type="button"
                    disabled={isInstalling}
                    onClick={() => handleInstall(l.id)}
                    className="ml-auto flex items-center gap-1 rounded bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    <Download className="size-3" />
                    {t('agent.install')}
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
