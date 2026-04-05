import { useMemo, useState } from 'react';

import type { AuditAction, AuditSeverity, LogLevel } from '@/enums';
import { LogsTab } from '@/enums';
import { useAuditLogs } from '@/hooks/audit/use-audit-logs';
import { useLogStore } from '@/stores/log.store';
import type { UseLogsPageReturn } from '@/types';

export function useLogsPage(): UseLogsPageReturn {
  const [activeTab, setActiveTab] = useState<LogsTab>(LogsTab.AUDIT);

  const clientEntries = useLogStore((state) => state.entries);
  const clearEntries = useLogStore((state) => state.clearEntries);

  const [levelFilter, setLevelFilter] = useState<string | undefined>(undefined);
  const [componentFilter, setComponentFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

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

  const uniqueComponents = useMemo(() => {
    const components = new Set<string>();
    for (const entry of clientEntries) {
      components.add(entry.component);
    }
    return Array.from(components).sort();
  }, [clientEntries]);

  const filteredClientLogs = useMemo(() => {
    let filtered = clientEntries;

    if (levelFilter) {
      const level = levelFilter as LogLevel;
      filtered = filtered.filter((entry) => entry.level === level);
    }

    if (componentFilter) {
      filtered = filtered.filter((entry) => entry.component === componentFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (entry) =>
          entry.message.toLowerCase().includes(query) ||
          entry.action.toLowerCase().includes(query) ||
          entry.component.toLowerCase().includes(query) ||
          (entry.details && JSON.stringify(entry.details).toLowerCase().includes(query)),
      );
    }

    return filtered;
  }, [clientEntries, levelFilter, componentFilter, searchQuery]);

  return {
    activeTab,
    setActiveTab,
    clientLogs: clientEntries,
    filteredClientLogs,
    auditLogs,
    auditMeta,
    auditPage,
    setAuditPage,
    isAuditLoading,
    isAuditError,
    levelFilter,
    setLevelFilter,
    componentFilter,
    setComponentFilter,
    searchQuery,
    setSearchQuery,
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
    clearClientLogs: clearEntries,
    uniqueComponents,
  };
}
