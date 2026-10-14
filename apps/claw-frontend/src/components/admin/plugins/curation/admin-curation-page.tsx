'use client';

import Link from 'next/link';

import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ROUTES } from '@/constants/routes.constants';
import { AdminCurationTab } from '@/enums/admin-curation-tab.enum';
import { useAdminCurationPage } from '@/hooks/plugins/use-admin-curation-page';

import { AdminCurationAuditTab } from './admin-curation-audit-tab';
import { AdminCurationDeleteDialog } from './admin-curation-delete-dialog';
import { AdminCurationEntriesTab } from './admin-curation-entries-tab';
import { AdminCurationEntryDialog } from './admin-curation-entry-dialog';
import { AdminCurationQueueTab } from './admin-curation-queue-tab';
import { AdminCurationRejectDialog } from './admin-curation-reject-dialog';
import { AdminCurationRulesTab } from './admin-curation-rules-tab';

/** /admin/plugins/curation (PLUGINS_ADMIN): curated entries, the approval queue, rules and the audit log. */
export function AdminCurationPage(): React.ReactElement {
  const page = useAdminCurationPage();
  const { t, dialogs } = page;
  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title={t('pluginsAdminCatalog.page.title')}
        description={t('pluginsAdminCatalog.page.description')}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href={ROUTES.ADMIN_PLUGINS}>{t('pluginsAdminCatalog.page.back')}</Link>
          </Button>
        }
      />
      <Tabs
        value={page.tab}
        onValueChange={(value) => {
          page.setTab(Object.values(AdminCurationTab).find((tab) => tab === value) ?? page.tab);
        }}
      >
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value={AdminCurationTab.Entries}>
            {t('pluginsAdminCatalog.page.tabEntries')}
          </TabsTrigger>
          <TabsTrigger value={AdminCurationTab.Queue}>
            {t('pluginsAdminCatalog.page.tabQueue')}
          </TabsTrigger>
          <TabsTrigger value={AdminCurationTab.Rules}>
            {t('pluginsAdminCatalog.page.tabRules')}
          </TabsTrigger>
          <TabsTrigger value={AdminCurationTab.Audit}>
            {t('pluginsAdminCatalog.page.tabAudit')}
          </TabsTrigger>
        </TabsList>
        <TabsContent value={AdminCurationTab.Entries} className="mt-4">
          <AdminCurationEntriesTab state={page.entries} dialogs={dialogs} t={t} />
        </TabsContent>
        <TabsContent value={AdminCurationTab.Queue} className="mt-4">
          <AdminCurationQueueTab state={page.queue} dialogs={dialogs} t={t} />
        </TabsContent>
        <TabsContent value={AdminCurationTab.Rules} className="mt-4">
          <AdminCurationRulesTab state={page.rules} t={t} />
        </TabsContent>
        <TabsContent value={AdminCurationTab.Audit} className="mt-4">
          <AdminCurationAuditTab state={page.audit} t={t} />
        </TabsContent>
      </Tabs>
      <AdminCurationEntryDialog
        open={dialogs.entryOpen}
        entry={dialogs.entry}
        onClose={dialogs.closeEntry}
        t={t}
      />
      <AdminCurationDeleteDialog
        entry={dialogs.deleteTarget}
        onConfirm={page.entries.remove}
        onClose={dialogs.closeDelete}
        t={t}
      />
      <AdminCurationRejectDialog
        server={dialogs.rejectTarget}
        reason={dialogs.reason}
        onReason={dialogs.setReason}
        busy={page.queue.pendingId !== null}
        onConfirm={page.queue.reject}
        onClose={dialogs.closeReject}
        t={t}
      />
    </div>
  );
}
