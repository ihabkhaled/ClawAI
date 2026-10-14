'use client';

import Link from 'next/link';

import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ADMIN_CURATION_ROUTE } from '@/constants/plugin-admin-curation.constants';
import { AdminPluginsTab } from '@/enums/admin-plugins-tab.enum';
import { useAdminPluginsPage } from '@/hooks/plugins/use-admin-plugins-page';

import { AdminPluginCatalogTab } from './admin-plugin-catalog-tab';
import { AdminPluginSettingsTab } from './admin-plugin-settings-tab';

/** /admin/plugins (PLUGINS_ADMIN): the catalog kill switches and the PluginSetting rows. */
export function AdminPluginsPage(): React.ReactElement {
  const page = useAdminPluginsPage();
  const { t } = page;
  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title={t('pluginsInstall.admin.title')}
        description={t('pluginsInstall.admin.description')}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href={ADMIN_CURATION_ROUTE}>{t('pluginsAdminCatalog.page.open')}</Link>
          </Button>
        }
      />
      <Tabs
        value={page.tab}
        onValueChange={(value) => {
          page.setTab(
            value === AdminPluginsTab.Settings ? AdminPluginsTab.Settings : AdminPluginsTab.Catalog,
          );
        }}
      >
        <TabsList>
          <TabsTrigger value={AdminPluginsTab.Catalog}>
            {t('pluginsInstall.admin.tabCatalog')}
          </TabsTrigger>
          <TabsTrigger value={AdminPluginsTab.Settings}>
            {t('pluginsInstall.admin.tabSettings')}
          </TabsTrigger>
        </TabsList>
        <TabsContent value={AdminPluginsTab.Catalog} className="mt-4">
          <AdminPluginCatalogTab catalog={page.catalog} t={t} />
        </TabsContent>
        <TabsContent value={AdminPluginsTab.Settings} className="mt-4">
          <AdminPluginSettingsTab settings={page.settings} t={t} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
