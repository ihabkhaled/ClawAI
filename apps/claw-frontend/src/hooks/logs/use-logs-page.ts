import { useState } from 'react';

import type { AuditAction, AuditSeverity } from '@/enums';
import { LogsTab } from '@/enums';
import { useAuditLogs } from '@/hooks/audit/use-audit-logs';
import { useClientLogs } from '@/hooks/logs/use-client-logs';
import { useServerLogs } from '@/hooks/logs/use-server-logs';
import { usePagination } from '@/hooks/use-pagination';
import type { UseLogsPageReturn } from '@/types';

export function useLogsPage(): UseLogsPageReturn {
  const [activeTab, setActiveTab] = useState<LogsTab>(LogsTab.CLIENT);

  // Each tab keeps its own page and page size: switching tabs must not drag the
  // reader to page 9 of a list they were not reading.
  const clientPagination = usePagination();
  const serverPagination = usePagination();
  const auditPagination = usePagination();

  // Client logs state
  const [clientLevelFilter, setClientLevelFilter] = useState<string | undefined>(undefined);
  const [clientComponentFilter, setClientComponentFilter] = useState('');
  const [clientActionFilter, setClientActionFilter] = useState('');
  const [clientRouteFilter, setClientRouteFilter] = useState('');
  const [clientUserIdFilter, setClientUserIdFilter] = useState('');
  const [clientMessageContainsFilter, setClientMessageContainsFilter] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [clientStartDate, setClientStartDate] = useState('');
  const [clientEndDate, setClientEndDate] = useState('');

  const {
    clientLogs,
    meta: clientLogsMeta,
    isLoading: isClientLogsLoading,
    isError: isClientLogsError,
  } = useClientLogs({
    page: clientPagination.page,
    limit: clientPagination.pageSize,
    level: clientLevelFilter,
    component: clientComponentFilter || undefined,
    action: clientActionFilter || undefined,
    route: clientRouteFilter || undefined,
    userId: clientUserIdFilter || undefined,
    messageContains: clientMessageContainsFilter || undefined,
    search: clientSearch || undefined,
    startDate: clientStartDate || undefined,
    endDate: clientEndDate || undefined,
  });

  // Server logs state
  const [serverLevelFilter, setServerLevelFilter] = useState<string | undefined>(undefined);
  const [serverServiceFilter, setServerServiceFilter] = useState('');
  const [serverControllerFilter, setServerControllerFilter] = useState('');
  const [serverActionFilter, setServerActionFilter] = useState('');
  const [serverMethodFilter, setServerMethodFilter] = useState('');
  const [serverRouteFilter, setServerRouteFilter] = useState('');
  const [serverMessageContainsFilter, setServerMessageContainsFilter] = useState('');
  const [serverSearch, setServerSearch] = useState('');
  const [serverStartDate, setServerStartDate] = useState('');
  const [serverEndDate, setServerEndDate] = useState('');

  const {
    serverLogs,
    meta: serverLogsMeta,
    isLoading: isServerLogsLoading,
    isError: isServerLogsError,
  } = useServerLogs({
    page: serverPagination.page,
    limit: serverPagination.pageSize,
    level: serverLevelFilter,
    serviceName: serverServiceFilter || undefined,
    controller: serverControllerFilter || undefined,
    action: serverActionFilter || undefined,
    method: serverMethodFilter || undefined,
    route: serverRouteFilter || undefined,
    messageContains: serverMessageContainsFilter || undefined,
    search: serverSearch || undefined,
    startDate: serverStartDate || undefined,
    endDate: serverEndDate || undefined,
  });

  // Audit logs state
  const [auditAction, setAuditAction] = useState<string | undefined>(undefined);
  const [auditSeverity, setAuditSeverity] = useState<string | undefined>(undefined);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditEntityType, setAuditEntityType] = useState('');
  const [auditStartDate, setAuditStartDate] = useState('');
  const [auditEndDate, setAuditEndDate] = useState('');

  const {
    auditLogs,
    meta: auditMeta,
    isLoading: isAuditLoading,
    isError: isAuditError,
  } = useAuditLogs({
    page: auditPagination.page,
    limit: auditPagination.pageSize,
    action: auditAction as AuditAction | undefined,
    severity: auditSeverity as AuditSeverity | undefined,
    entityType: auditEntityType || undefined,
    startDate: auditStartDate || undefined,
    endDate: auditEndDate || undefined,
    search: auditSearch || undefined,
  });

  return {
    activeTab,
    setActiveTab,

    clientLogs,
    clientLogsMeta,
    clientLogsPage: clientPagination.page,
    setClientLogsPage: clientPagination.goToPage,
    clientLogsPageSize: clientPagination.pageSize,
    setClientLogsPageSize: clientPagination.setPageSize,
    isClientLogsLoading,
    isClientLogsError,
    clientLevelFilter,
    setClientLevelFilter: (level: string | undefined) => {
      setClientLevelFilter(level);
      clientPagination.reset();
    },
    clientComponentFilter,
    setClientComponentFilter: (component: string) => {
      setClientComponentFilter(component);
      clientPagination.reset();
    },
    clientActionFilter,
    setClientActionFilter: (action: string) => {
      setClientActionFilter(action);
      clientPagination.reset();
    },
    clientRouteFilter,
    setClientRouteFilter: (route: string) => {
      setClientRouteFilter(route);
      clientPagination.reset();
    },
    clientUserIdFilter,
    setClientUserIdFilter: (userId: string) => {
      setClientUserIdFilter(userId);
      clientPagination.reset();
    },
    clientMessageContainsFilter,
    setClientMessageContainsFilter: (contains: string) => {
      setClientMessageContainsFilter(contains);
      clientPagination.reset();
    },
    clientSearch,
    setClientSearch: (search: string) => {
      setClientSearch(search);
      clientPagination.reset();
    },
    clientStartDate,
    setClientStartDate: (date: string) => {
      setClientStartDate(date);
      clientPagination.reset();
    },
    clientEndDate,
    setClientEndDate: (date: string) => {
      setClientEndDate(date);
      clientPagination.reset();
    },

    serverLogs,
    serverLogsMeta,
    serverLogsPage: serverPagination.page,
    setServerLogsPage: serverPagination.goToPage,
    serverLogsPageSize: serverPagination.pageSize,
    setServerLogsPageSize: serverPagination.setPageSize,
    isServerLogsLoading,
    isServerLogsError,
    serverLevelFilter,
    setServerLevelFilter: (level: string | undefined) => {
      setServerLevelFilter(level);
      serverPagination.reset();
    },
    serverServiceFilter,
    setServerServiceFilter: (service: string) => {
      setServerServiceFilter(service);
      serverPagination.reset();
    },
    serverControllerFilter,
    setServerControllerFilter: (controller: string) => {
      setServerControllerFilter(controller);
      serverPagination.reset();
    },
    serverActionFilter,
    setServerActionFilter: (action: string) => {
      setServerActionFilter(action);
      serverPagination.reset();
    },
    serverMethodFilter,
    setServerMethodFilter: (method: string) => {
      setServerMethodFilter(method);
      serverPagination.reset();
    },
    serverRouteFilter,
    setServerRouteFilter: (route: string) => {
      setServerRouteFilter(route);
      serverPagination.reset();
    },
    serverMessageContainsFilter,
    setServerMessageContainsFilter: (contains: string) => {
      setServerMessageContainsFilter(contains);
      serverPagination.reset();
    },
    serverSearch,
    setServerSearch: (search: string) => {
      setServerSearch(search);
      serverPagination.reset();
    },
    serverStartDate,
    setServerStartDate: (date: string) => {
      setServerStartDate(date);
      serverPagination.reset();
    },
    serverEndDate,
    setServerEndDate: (date: string) => {
      setServerEndDate(date);
      serverPagination.reset();
    },

    auditLogs,
    auditMeta,
    auditPage: auditPagination.page,
    setAuditPage: auditPagination.goToPage,
    auditPageSize: auditPagination.pageSize,
    setAuditPageSize: auditPagination.setPageSize,
    isAuditLoading,
    isAuditError,
    auditAction,
    // The audit filters reset here rather than at the page, so the rule holds
    // wherever they are called from — the page used to do it by hand.
    setAuditAction: (action: string | undefined) => {
      setAuditAction(action);
      auditPagination.reset();
    },
    auditSeverity,
    setAuditSeverity: (severity: string | undefined) => {
      setAuditSeverity(severity);
      auditPagination.reset();
    },
    auditSearch,
    setAuditSearch: (search: string) => {
      setAuditSearch(search);
      auditPagination.reset();
    },
    auditEntityType,
    setAuditEntityType: (entityType: string) => {
      setAuditEntityType(entityType);
      auditPagination.reset();
    },
    auditStartDate,
    setAuditStartDate: (date: string) => {
      setAuditStartDate(date);
      auditPagination.reset();
    },
    auditEndDate,
    setAuditEndDate: (date: string) => {
      setAuditEndDate(date);
      auditPagination.reset();
    },
  };
}
