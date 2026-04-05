'use client';

import { Trash2 } from 'lucide-react';

import { PageHeader } from '@/components/common/page-header';
import { AuditLogsTab } from '@/components/logs/audit-logs-tab';
import { ClientLogsTab } from '@/components/logs/client-logs-tab';
import { Button } from '@/components/ui/button';
import { LogsTab } from '@/enums';
import { useLogsPage } from '@/hooks/logs/use-logs-page';
import { useTranslation } from '@/lib/i18n';

export default function LogsPage() {
  const controller = useLogsPage();
  const { t } = useTranslation();

  return (
    <div>
      <PageHeader
        title={t('nav.logs')}
        description={t('audits.description')}
        actions={
          controller.activeTab === LogsTab.CLIENT ? (
            <Button
              variant="outline"
              size="sm"
              onClick={controller.clearClientLogs}
              disabled={controller.clientLogs.length === 0}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Clear Client Logs
            </Button>
          ) : undefined
        }
      />

      <div className="mb-4 flex gap-2">
        <Button
          variant={controller.activeTab === LogsTab.AUDIT ? 'default' : 'outline'}
          size="sm"
          onClick={() => controller.setActiveTab(LogsTab.AUDIT)}
        >
          Audit Logs
        </Button>
        <Button
          variant={controller.activeTab === LogsTab.CLIENT ? 'default' : 'outline'}
          size="sm"
          onClick={() => controller.setActiveTab(LogsTab.CLIENT)}
        >
          Client Logs ({controller.clientLogs.length})
        </Button>
      </div>

      {controller.activeTab === LogsTab.AUDIT ? (
        <AuditLogsTab
          auditLogs={controller.auditLogs}
          meta={controller.auditMeta}
          page={controller.auditPage}
          setPage={controller.setAuditPage}
          isLoading={controller.isAuditLoading}
          isError={controller.isAuditError}
          action={controller.auditAction}
          setAction={(v) => {
            controller.setAuditAction(v);
            controller.setAuditPage(1);
          }}
          severity={controller.auditSeverity}
          setSeverity={(v) => {
            controller.setAuditSeverity(v);
            controller.setAuditPage(1);
          }}
          search={controller.auditSearch}
          setSearch={(v) => {
            controller.setAuditSearch(v);
            controller.setAuditPage(1);
          }}
          entityType={controller.auditEntityType}
          setEntityType={(v) => {
            controller.setAuditEntityType(v);
            controller.setAuditPage(1);
          }}
          startDate={controller.auditStartDate}
          setStartDate={(v) => {
            controller.setAuditStartDate(v);
            controller.setAuditPage(1);
          }}
          endDate={controller.auditEndDate}
          setEndDate={(v) => {
            controller.setAuditEndDate(v);
            controller.setAuditPage(1);
          }}
        />
      ) : (
        <ClientLogsTab
          logs={controller.filteredClientLogs}
          levelFilter={controller.levelFilter}
          setLevelFilter={controller.setLevelFilter}
          componentFilter={controller.componentFilter}
          setComponentFilter={controller.setComponentFilter}
          searchQuery={controller.searchQuery}
          setSearchQuery={controller.setSearchQuery}
          uniqueComponents={controller.uniqueComponents}
        />
      )}
    </div>
  );
}
