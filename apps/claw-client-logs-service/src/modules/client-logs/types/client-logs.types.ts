export interface CreateClientLogInput {
  level: string;
  message: string;
  component?: string;
  action?: string;
  route?: string;
  userId?: string;
  sessionId?: string;
  threadId?: string;
  connectorId?: string;
  requestId?: string;
  locale?: string;
  appearance?: string;
  userAgent?: string;
  errorCode?: string;
  errorStack?: string;
  metadata?: Record<string, unknown>;
}

export interface ClientLogFilters {
  level?: string;
  component?: string;
  action?: string;
  route?: string;
  userId?: string;
  sessionId?: string;
  threadId?: string;
  connectorId?: string;
  requestId?: string;
  errorCode?: string;
  search?: string;
  messageContains?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: string;
  page?: number;
  limit?: number;
}

export interface CreateClientLogResponse {
  id: string;
}

export interface AggregationResult {
  _id: string;
  count: number;
}

export interface DistinctValuesResult {
  field: string;
  values: string[];
}

export interface ClientLogStatsResponse {
  byLevel: AggregationResult[];
  topComponents: AggregationResult[];
  topActions: AggregationResult[];
  topRoutes: AggregationResult[];
  errorCount: number;
  total: number;
}
