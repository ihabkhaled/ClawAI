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
      <PageHeader title={t('nav.logs')} description={t('audits.description')} />

      <div className="mb-4 flex gap-2">
        <Button
          variant={controller.activeTab === LogsTab.CLIENT ? 'default' : 'outline'}
          size="sm"
          onClick={() => controller.setActiveTab(LogsTab.CLIENT)}
        >
          {t('observability.clientLogs')}
        </Button>
        <Button
          variant={controller.activeTab === LogsTab.SERVER ? 'default' : 'outline'}
          size="sm"
          onClick={() => controller.setActiveTab(LogsTab.SERVER)}
        >
          {t('observability.serverLogs')}
        </Button>
        <Button
          variant={controller.activeTab === LogsTab.AUDIT ? 'default' : 'outline'}
          size="sm"
          onClick={() => controller.setActiveTab(LogsTab.AUDIT)}
        >
          {t('observability.auditTrail')}
        </Button>
      </div>

      {controller.activeTab === LogsTab.CLIENT && (
        <ClientLogsTab
          logs={controller.clientLogs}
          meta={controller.clientLogsMeta}
          page={controller.clientLogsPage}
          setPage={controller.setClientLogsPage}
          pageSize={controller.clientLogsPageSize}
          setPageSize={controller.setClientLogsPageSize}
          isLoading={controller.isClientLogsLoading}
          isError={controller.isClientLogsError}
          levelFilter={controller.clientLevelFilter}
          setLevelFilter={controller.setClientLevelFilter}
          componentFilter={controller.clientComponentFilter}
          setComponentFilter={controller.setClientComponentFilter}
          actionFilter={controller.clientActionFilter}
          setActionFilter={controller.setClientActionFilter}
          routeFilter={controller.clientRouteFilter}
          setRouteFilter={controller.setClientRouteFilter}
          userIdFilter={controller.clientUserIdFilter}
          setUserIdFilter={controller.setClientUserIdFilter}
          messageContainsFilter={controller.clientMessageContainsFilter}
          setMessageContainsFilter={controller.setClientMessageContainsFilter}
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
          pageSize={controller.serverLogsPageSize}
          setPageSize={controller.setServerLogsPageSize}
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
          methodFilter={controller.serverMethodFilter}
          setMethodFilter={controller.setServerMethodFilter}
          routeFilter={controller.serverRouteFilter}
          setRouteFilter={controller.setServerRouteFilter}
          messageContainsFilter={controller.serverMessageContainsFilter}
          setMessageContainsFilter={controller.setServerMessageContainsFilter}
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
          pageSize={controller.auditPageSize}
          setPageSize={controller.setAuditPageSize}
          isLoading={controller.isAuditLoading}
          isError={controller.isAuditError}
          action={controller.auditAction}
          setAction={controller.setAuditAction}
          severity={controller.auditSeverity}
          setSeverity={controller.setAuditSeverity}
          search={controller.auditSearch}
          setSearch={controller.setAuditSearch}
          entityType={controller.auditEntityType}
          setEntityType={controller.setAuditEntityType}
          startDate={controller.auditStartDate}
          setStartDate={controller.setAuditStartDate}
          endDate={controller.auditEndDate}
          setEndDate={controller.setAuditEndDate}
        />
      )}
    </div>
  );
}
