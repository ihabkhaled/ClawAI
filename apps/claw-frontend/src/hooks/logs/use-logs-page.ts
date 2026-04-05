import { useState } from 'react';

import type { AuditAction, AuditSeverity } from '@/enums';
import { LogsTab } from '@/enums';
import { useAuditLogs } from '@/hooks/audit/use-audit-logs';
import { useClientLogs } from '@/hooks/logs/use-client-logs';
import { useServerLogs } from '@/hooks/logs/use-server-logs';
import type { UseLogsPageReturn } from '@/types';

export function useLogsPage(): UseLogsPageReturn {
  const [activeTab, setActiveTab] = useState<LogsTab>(LogsTab.CLIENT);

  // Client logs state
  const [clientLogsPage, setClientLogsPage] = useState(1);
  const [clientLevelFilter, setClientLevelFilter] = useState<string | undefined>(undefined);
  const [clientComponentFilter, setClientComponentFilter] = useState('');
  const [clientRouteFilter, setClientRouteFilter] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [clientStartDate, setClientStartDate] = useState('');
  const [clientEndDate, setClientEndDate] = useState('');

  const {
    clientLogs,
    meta: clientLogsMeta,
    isLoading: isClientLogsLoading,
    isError: isClientLogsError,
  } = useClientLogs({
    page: clientLogsPage,
    limit: 25,
    level: clientLevelFilter,
    component: clientComponentFilter || undefined,
    route: clientRouteFilter || undefined,
    search: clientSearch || undefined,
    startDate: clientStartDate || undefined,
    endDate: clientEndDate || undefined,
  });

  // Server logs state
  const [serverLogsPage, setServerLogsPage] = useState(1);
  const [serverLevelFilter, setServerLevelFilter] = useState<string | undefined>(undefined);
  const [serverServiceFilter, setServerServiceFilter] = useState('');
  const [serverControllerFilter, setServerControllerFilter] = useState('');
  const [serverActionFilter, setServerActionFilter] = useState('');
  const [serverSearch, setServerSearch] = useState('');
  const [serverStartDate, setServerStartDate] = useState('');
  const [serverEndDate, setServerEndDate] = useState('');

  const {
    serverLogs,
    meta: serverLogsMeta,
    isLoading: isServerLogsLoading,
    isError: isServerLogsError,
  } = useServerLogs({
    page: serverLogsPage,
    limit: 25,
    level: serverLevelFilter,
    serviceName: serverServiceFilter || undefined,
    controller: serverControllerFilter || undefined,
    action: serverActionFilter || undefined,
    search: serverSearch || undefined,
    startDate: serverStartDate || undefined,
    endDate: serverEndDate || undefined,
  });

  // Audit logs state
  const [auditPage, setAuditPage] = useState(1);
  const [auditAction, setAuditAction] = useState<string | undefined>(undefined);
  const [auditSeverity, setAuditSeverity] = useState<string | undefined>(undefined);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditEntityType, setAuditEntityType] = useState('');
  const [auditStartDate, setAuditStartDate] = useState('');
  const [auditEndDate, setAuditEndDate] = useState('');

  const { auditLogs, meta: auditMeta, isLoading: isAuditLoading, isError: isAuditError } =
    useAuditLogs({
      page: auditPage,
      limit: 25,
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
    clientLogsPage,
    setClientLogsPage: (page: number) => {
      setClientLogsPage(page);
    },
    isClientLogsLoading,
    isClientLogsError,
    clientLevelFilter,
    setClientLevelFilter: (level: string | undefined) => {
      setClientLevelFilter(level);
      setClientLogsPage(1);
    },
    clientComponentFilter,
    setClientComponentFilter: (component: string) => {
      setClientComponentFilter(component);
      setClientLogsPage(1);
    },
    clientRouteFilter,
    setClientRouteFilter: (route: string) => {
      setClientRouteFilter(route);
      setClientLogsPage(1);
    },
    clientSearch,
    setClientSearch: (search: string) => {
      setClientSearch(search);
      setClientLogsPage(1);
    },
    clientStartDate,
    setClientStartDate: (date: string) => {
      setClientStartDate(date);
      setClientLogsPage(1);
    },
    clientEndDate,
    setClientEndDate: (date: string) => {
      setClientEndDate(date);
      setClientLogsPage(1);
    },

    serverLogs,
    serverLogsMeta,
    serverLogsPage,
    setServerLogsPage: (page: number) => {
      setServerLogsPage(page);
    },
    isServerLogsLoading,
    isServerLogsError,
    serverLevelFilter,
    setServerLevelFilter: (level: string | undefined) => {
      setServerLevelFilter(level);
      setServerLogsPage(1);
    },
    serverServiceFilter,
    setServerServiceFilter: (service: string) => {
      setServerServiceFilter(service);
      setServerLogsPage(1);
    },
    serverControllerFilter,
    setServerControllerFilter: (controller: string) => {
      setServerControllerFilter(controller);
      setServerLogsPage(1);
    },
    serverActionFilter,
    setServerActionFilter: (action: string) => {
      setServerActionFilter(action);
      setServerLogsPage(1);
    },
    serverSearch,
    setServerSearch: (search: string) => {
      setServerSearch(search);
      setServerLogsPage(1);
    },
    serverStartDate,
    setServerStartDate: (date: string) => {
      setServerStartDate(date);
      setServerLogsPage(1);
    },
    serverEndDate,
    setServerEndDate: (date: string) => {
      setServerEndDate(date);
      setServerLogsPage(1);
    },

    auditLogs,
    auditMeta,
    auditPage,
    setAuditPage,
    isAuditLoading,
    isAuditError,
    auditAction,
    setAuditAction,
    auditSeverity,
    setAuditSeverity,
    auditSearch,
    setAuditSearch,
    auditEntityType,
    setAuditEntityType,
    auditStartDate,
    setAuditStartDate,
    auditEndDate,
    setAuditEndDate,
  };
}
