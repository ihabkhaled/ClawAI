import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PLUGIN_INSTALLED_SKELETON_KEYS } from '@/constants/plugin-installs.constants';
import { AlertVariant } from '@/enums/alert-variant.enum';
import type { AdminPluginCatalogTabProps } from '@/types/plugin-installs.types';

import { AdminPluginCatalogRow } from './admin-plugin-catalog-row';

/** The catalog tab: loading, error and empty states, then one row per entry. */
export function AdminPluginCatalogTab({
  catalog,
  t,
}: AdminPluginCatalogTabProps): React.ReactElement {
  if (catalog.isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4" role="status" aria-label={t('plugins.loading')}>
        {PLUGIN_INSTALLED_SKELETON_KEYS.map((key) => (
          <Skeleton key={key} className="min-h-32 w-full rounded-xl" />
        ))}
      </div>
    );
  }
  if (catalog.isError) {
    return (
      <Alert
        variant={AlertVariant.Error}
        title={t('pluginsInstall.admin.errorTitle')}
        description={t('pluginsInstall.admin.errorDescription')}
        action={
          <Button type="button" size="sm" variant="outline" onClick={catalog.retry}>
            {t('common.retry')}
          </Button>
        }
      />
    );
  }
  if (catalog.entries.length === 0) {
    return <p className="text-muted-foreground text-sm">{t('pluginsInstall.admin.empty')}</p>;
  }
  return (
    <div className="space-y-4">
      {catalog.errorMessage === null ? null : (
        <Alert variant={AlertVariant.Error} description={catalog.errorMessage} />
      )}
      <ul className="grid grid-cols-1 gap-4">
        {catalog.entries.map((entry) => (
          <li key={entry.slug} className="min-w-0">
            <AdminPluginCatalogRow
              entry={entry}
              busy={catalog.pendingSlug === entry.slug}
              onGloballyEnabled={catalog.setGloballyEnabled}
              onFeatured={catalog.setFeatured}
              onToolDisabled={catalog.setToolDisabled}
              t={t}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
