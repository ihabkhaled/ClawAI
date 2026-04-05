import type { LogLevel, LogsTab } from '@/enums';

import type { AuditLog } from './audit.types';

export type LogEntry = {
  id: string;
  level: LogLevel;
  message: string;
  component: string;
  action: string;
  timestamp: string;
  userId?: string;
  details?: Record<string, unknown>;
};

export type LogFilterParams = {
  level?: LogLevel;
  component?: string;
  search?: string;
};

export type LogStoreState = {
  entries: LogEntry[];
  maxEntries: number;
};

export type LogStoreActions = {
  addEntry: (entry: LogEntry) => void;
  clearEntries: () => void;
};

export type AuditLogsTabProps = {
  auditLogs: AuditLog[];
  meta: { page: number; totalPages: number; total: number };
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  isLoading: boolean;
  isError: boolean;
  action: string | undefined;
  setAction: (action: string | undefined) => void;
  severity: string | undefined;
  setSeverity: (severity: string | undefined) => void;
  search: string;
  setSearch: (search: string) => void;
  entityType: string;
  setEntityType: (entityType: string) => void;
  startDate: string;
  setStartDate: (date: string) => void;
  endDate: string;
  setEndDate: (date: string) => void;
};

export type ClientLogsTabProps = {
  logs: LogEntry[];
  levelFilter: string | undefined;
  setLevelFilter: (level: string | undefined) => void;
  componentFilter: string;
  setComponentFilter: (component: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  uniqueComponents: string[];
};

export type UseLogsPageReturn = {
  activeTab: LogsTab;
  setActiveTab: (tab: LogsTab) => void;
  clientLogs: LogEntry[];
  filteredClientLogs: LogEntry[];
  auditLogs: AuditLog[];
  auditMeta: { page: number; totalPages: number; total: number };
  auditPage: number;
  setAuditPage: React.Dispatch<React.SetStateAction<number>>;
  isAuditLoading: boolean;
  isAuditError: boolean;
  levelFilter: string | undefined;
  setLevelFilter: (level: string | undefined) => void;
  componentFilter: string;
  setComponentFilter: (component: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  auditAction: string | undefined;
  setAuditAction: (action: string | undefined) => void;
  auditSeverity: string | undefined;
  setAuditSeverity: (severity: string | undefined) => void;
  auditSearch: string;
  setAuditSearch: (search: string) => void;
  auditEntityType: string;
  setAuditEntityType: (entityType: string) => void;
  auditStartDate: string;
  setAuditStartDate: (date: string) => void;
  auditEndDate: string;
  setAuditEndDate: (date: string) => void;
  clearClientLogs: () => void;
  uniqueComponents: string[];
};
