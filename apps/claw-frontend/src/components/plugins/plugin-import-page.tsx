'use client';

import { PageHeader } from '@/components/common/page-header';
import { Alert } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertVariant } from '@/enums/alert-variant.enum';
import { PluginsNavTab } from '@/enums/plugins-nav-tab.enum';
import { usePluginImportPage } from '@/hooks/plugins/use-plugin-import-page';

import { ImportedPluginCard } from './imported-plugin-card';
import { PluginImportMarketplaceList } from './plugin-import-marketplace-list';
import { PluginImportReview } from './plugin-import-review';
import { PluginImportSourceForm } from './plugin-import-source-form';
import { PluginsNav } from './plugins-nav';

/** Import a plugin from GitHub or an upload: read it, review it, then install it as inert documents. */
export function PluginImportPage(): React.ReactElement {
  const page = usePluginImportPage();
  const { t } = page;
  return (
    <div>
      <PageHeader title={t('plugins.title')} description={t('pluginImport.description')} />
      <PluginsNav active={PluginsNavTab.Import} t={t} />

      <div className="space-y-6">
        <PluginImportSourceForm
          form={page.form}
          setMode={page.setMode}
          setSource={page.setSource}
          setFile={page.setFile}
          canPreview={page.canPreview}
          busy={page.isPreviewing}
          onPreview={page.preview}
          t={t}
        />

        {page.errorMessage === null ? null : (
          <Alert variant={AlertVariant.Error} description={page.errorMessage} />
        )}

        {page.candidates === undefined ? null : (
          <PluginImportMarketplaceList
            name={page.marketplaceName}
            candidates={page.candidates}
            onChoose={page.chooseCandidate}
            t={t}
          />
        )}

        {page.draft === undefined ? null : (
          <PluginImportReview
            draft={page.draft}
            acknowledged={page.acknowledged}
            setAcknowledged={page.setAcknowledged}
            canInstall={page.canInstall}
            busy={page.isInstalling}
            onInstall={page.install}
            onDiscard={page.discard}
            t={t}
          />
        )}

        <section className="space-y-3" aria-label={t('pluginImport.imported.title')}>
          <h2 className="text-lg font-semibold">{t('pluginImport.imported.title')}</h2>
          {page.isLoadingImported ? <Skeleton className="h-16 w-full" /> : null}
          {!page.isLoadingImported && page.imported.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t('pluginImport.imported.empty')}</p>
          ) : null}
          <ul className="space-y-2">
            {page.imported.map((plugin) => (
              <ImportedPluginCard
                key={plugin.id}
                plugin={plugin}
                busy={page.removingId === plugin.id}
                onRemove={page.remove}
                t={t}
              />
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
