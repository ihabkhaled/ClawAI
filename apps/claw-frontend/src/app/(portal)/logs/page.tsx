'use client';

import { PageHeader } from '@/components/common/page-header';
import { AuditLogsTab } from '@/components/logs/audit-logs-tab';
import { ClientLogsTab } from '@/components/logs/client-logs-tab';
import { ServerLogsTab } from '@/components/logs/server-logs-tab';
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
      />

      <div className="mb-4 flex gap-2">
        <Button
          variant={controller.activeTab === LogsTab.CLIENT ? 'default' : 'outline'}
          size="sm"
          onClick={() => controller.setActiveTab(LogsTab.CLIENT)}
        >
          Client Logs
        </Button>
        <Button
          variant={controller.activeTab === LogsTab.SERVER ? 'default' : 'outline'}
          size="sm"
          onClick={() => controller.setActiveTab(LogsTab.SERVER)}
        >
          Server Logs
        </Button>
        <Button
          variant={controller.activeTab === LogsTab.AUDIT ? 'default' : 'outline'}
          size="sm"
          onClick={() => controller.setActiveTab(LogsTab.AUDIT)}
        >
          Audit Trail
        </Button>
      </div>

      {controller.activeTab === LogsTab.CLIENT && (
        <ClientLogsTab
          logs={controller.clientLogs}
          meta={controller.clientLogsMeta}
          page={controller.clientLogsPage}
          setPage={controller.setClientLogsPage}
          isLoading={controller.isClientLogsLoading}
          isError={controller.isClientLogsError}
          levelFilter={controller.clientLevelFilter}
          setLevelFilter={controller.setClientLevelFilter}
          componentFilter={controller.clientComponentFilter}
          setComponentFilter={controller.setClientComponentFilter}
          routeFilter={controller.clientRouteFilter}
          setRouteFilter={controller.setClientRouteFilter}
          searchQuery={controller.clientSearch}
          setSearchQuery={controller.setClientSearch}
          startDate={controller.clientStartDate}
          setStartDate={controller.setClientStartDate}
          endDate={controller.clientEndDate}
          setEndDate={controller.setClientEndDate}
        />
      )}

      {controller.activeTab === LogsTab.SERVER && (
        <ServerLogsTab
          logs={controller.serverLogs}
          meta={controller.serverLogsMeta}
          page={controller.serverLogsPage}
          setPage={controller.setServerLogsPage}
          isLoading={controller.isServerLogsLoading}
          isError={controller.isServerLogsError}
          levelFilter={controller.serverLevelFilter}
          setLevelFilter={controller.setServerLevelFilter}
          serviceFilter={controller.serverServiceFilter}
          setServiceFilter={controller.setServerServiceFilter}
          controllerFilter={controller.serverControllerFilter}
          setControllerFilter={controller.setServerControllerFilter}
          actionFilter={controller.serverActionFilter}
          setActionFilter={controller.setServerActionFilter}
          searchQuery={controller.serverSearch}
          setSearchQuery={controller.setServerSearch}
          startDate={controller.serverStartDate}
          setStartDate={controller.setServerStartDate}
          endDate={controller.serverEndDate}
          setEndDate={controller.setServerEndDate}
        />
      )}

      {controller.activeTab === LogsTab.AUDIT && (
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
      )}
    </div>
  );
}
