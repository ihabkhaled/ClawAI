import type { LogLevel, LogsTab } from '@/enums';

import type { AuditLog, PaginationMeta } from './audit.types';

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

export type CreateClientLogRequest = {
  level: string;
  message: string;
  component: string;
  action: string;
  userId?: string;
  route?: string;
  locale?: string;
  appearance?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
};

export type ClientLogEntry = {
  _id: string;
  level: string;
  message: string;
  component: string;
  action: string;
  route: string;
  userId: string;
  sessionId: string;
  threadId: string;
  locale: string;
  appearance: string;
  userAgent: string;
  errorCode: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type ServerLogEntry = {
  _id: string;
  level: string;
  message: string;
  serviceName: string;
  module: string;
  controller: string;
  action: string;
  route: string;
  method: string;
  statusCode: number;
  requestId: string;
  traceId: string;
  userId: string;
  threadId: string;
  connectorId: string;
  provider: string;
  model: string;
  latencyMs: number;
  errorCode: string;
  errorMessage: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type ClientLogsResponse = {
  data: ClientLogEntry[];
  meta: PaginationMeta;
};

export type ServerLogsResponse = {
  data: ServerLogEntry[];
  meta: PaginationMeta;
};

export type LogStats = {
  byLevel: Array<{ _id: string; count: number }>;
  total: number;
};

export type ServerLogStats = {
  byLevel: Array<{ _id: string; count: number }>;
  byService: Array<{ _id: string; count: number }>;
  byAction: Array<{ _id: string; count: number }>;
  byMethod: Array<{ _id: string; count: number }>;
  byStatusCode: Array<{ _id: string; count: number }>;
  byModule: Array<{ _id: string; count: number }>;
  total: number;
  errorCount: number;
  avgLatencyMs: number;
};

export type ClientLogsListParams = {
  page?: number;
  limit?: number;
  level?: string;
  component?: string;
  action?: string;
  route?: string;
  userId?: string;
  sessionId?: string;
  search?: string;
  messageContains?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: string;
};

export type ClientLogStats = {
  byLevel: Array<{ _id: string; count: number }>;
  topComponents: Array<{ _id: string; count: number }>;
  topActions: Array<{ _id: string; count: number }>;
  topRoutes: Array<{ _id: string; count: number }>;
  errorCount: number;
  total: number;
};

export type ServerLogsListParams = {
  page?: number;
  limit?: number;
  level?: string;
  serviceName?: string;
  module?: string;
  controller?: string;
  service?: string;
  manager?: string;
  action?: string;
  method?: string;
  route?: string;
  statusCode?: number;
  statusCodeMin?: number;
  statusCodeMax?: number;
  requestId?: string;
  traceId?: string;
  userId?: string;
  threadId?: string;
  messageId?: string;
  connectorId?: string;
  provider?: string;
  modelName?: string;
  errorCode?: string;
  latencyMin?: number;
  latencyMax?: number;
  search?: string;
  messageContains?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: string;
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
  logs: ClientLogEntry[];
  meta: PaginationMeta;
  page: number;
  setPage: (page: number) => void;
  isLoading: boolean;
  isError: boolean;
  levelFilter: string | undefined;
  setLevelFilter: (level: string | undefined) => void;
  componentFilter: string;
  setComponentFilter: (component: string) => void;
  actionFilter: string;
  setActionFilter: (action: string) => void;
  routeFilter: string;
  setRouteFilter: (route: string) => void;
  userIdFilter: string;
  setUserIdFilter: (userId: string) => void;
  messageContainsFilter: string;
  setMessageContainsFilter: (contains: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  startDate: string;
  setStartDate: (date: string) => void;
  endDate: string;
  setEndDate: (date: string) => void;
};

export type ServerLogsTabProps = {
  logs: ServerLogEntry[];
  meta: PaginationMeta;
  page: number;
  setPage: (page: number) => void;
  isLoading: boolean;
  isError: boolean;
  levelFilter: string | undefined;
  setLevelFilter: (level: string | undefined) => void;
  serviceFilter: string;
  setServiceFilter: (service: string) => void;
  controllerFilter: string;
  setControllerFilter: (controller: string) => void;
  actionFilter: string;
  setActionFilter: (action: string) => void;
  methodFilter: string;
  setMethodFilter: (method: string) => void;
  routeFilter: string;
  setRouteFilter: (route: string) => void;
  messageContainsFilter: string;
  setMessageContainsFilter: (contains: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  startDate: string;
  setStartDate: (date: string) => void;
  endDate: string;
  setEndDate: (date: string) => void;
};

export type UseLogsPageReturn = {
  activeTab: LogsTab;
  setActiveTab: (tab: LogsTab) => void;
  clientLogs: ClientLogEntry[];
  clientLogsMeta: PaginationMeta;
  clientLogsPage: number;
  setClientLogsPage: (page: number) => void;
  isClientLogsLoading: boolean;
  isClientLogsError: boolean;
  clientLevelFilter: string | undefined;
  setClientLevelFilter: (level: string | undefined) => void;
  clientComponentFilter: string;
  setClientComponentFilter: (component: string) => void;
  clientActionFilter: string;
  setClientActionFilter: (action: string) => void;
  clientRouteFilter: string;
  setClientRouteFilter: (route: string) => void;
  clientUserIdFilter: string;
  setClientUserIdFilter: (userId: string) => void;
  clientMessageContainsFilter: string;
  setClientMessageContainsFilter: (contains: string) => void;
  clientSearch: string;
  setClientSearch: (search: string) => void;
  clientStartDate: string;
  setClientStartDate: (date: string) => void;
  clientEndDate: string;
  setClientEndDate: (date: string) => void;
  serverLogs: ServerLogEntry[];
  serverLogsMeta: PaginationMeta;
  serverLogsPage: number;
  setServerLogsPage: (page: number) => void;
  isServerLogsLoading: boolean;
  isServerLogsError: boolean;
  serverLevelFilter: string | undefined;
  setServerLevelFilter: (level: string | undefined) => void;
  serverServiceFilter: string;
  setServerServiceFilter: (service: string) => void;
  serverControllerFilter: string;
  setServerControllerFilter: (controller: string) => void;
  serverActionFilter: string;
  setServerActionFilter: (action: string) => void;
  serverMethodFilter: string;
  setServerMethodFilter: (method: string) => void;
  serverRouteFilter: string;
  setServerRouteFilter: (route: string) => void;
  serverMessageContainsFilter: string;
  setServerMessageContainsFilter: (contains: string) => void;
  serverSearch: string;
  setServerSearch: (search: string) => void;
  serverStartDate: string;
  setServerStartDate: (date: string) => void;
  serverEndDate: string;
  setServerEndDate: (date: string) => void;
  auditLogs: AuditLog[];
  auditMeta: { page: number; totalPages: number; total: number };
  auditPage: number;
  setAuditPage: React.Dispatch<React.SetStateAction<number>>;
  isAuditLoading: boolean;
  isAuditError: boolean;
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
};
