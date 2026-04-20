'use client';

import { Inbox } from 'lucide-react';

import { EmptyState } from '@/components/common/empty-state';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { PageHeader } from '@/components/common/page-header';
import { ProviderCard } from '@/components/workspace-providers/provider-card';
import { IMPLEMENTED_WORKSPACE_ADAPTERS } from '@/constants/workspace-providers.constants';
import { useProviderCatalog } from '@/hooks/workspace-providers/use-provider-catalog';
import { useTranslation } from '@/lib/i18n';

export default function WorkspaceProvidersPage(): React.ReactElement {
  const { t } = useTranslation();
  const { providers, isLoading, isError } = useProviderCatalog();

  return (
    <div className="flex h-full flex-col gap-6">
      <PageHeader
        title={t('workspaceProviders.catalog.title')}
        description={t('workspaceProviders.catalog.description')}
      />

      {isLoading ? <LoadingSpinner label={t('common.loading')} /> : null}

      {isError ? (
        <div className="rounded border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {t('workspaceProviders.catalog.loadFailed')}
        </div>
      ) : null}

      {!isLoading && !isError && providers.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={t('workspaceProviders.catalog.emptyTitle')}
          description={t('workspaceProviders.catalog.emptyDescription')}
        />
      ) : null}

      {!isLoading && providers.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {providers.map((provider) => (
            <ProviderCard
              key={provider.id}
              provider={provider}
              implementedAdapters={IMPLEMENTED_WORKSPACE_ADAPTERS}
              t={t}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
