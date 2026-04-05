export interface CreateServerLogInput {
  level: string;
  message: string;
  serviceName: string;
  module?: string;
  controller?: string;
  service?: string;
  manager?: string;
  repository?: string;
  action?: string;
  route?: string;
  method?: string;
  statusCode?: number;
  requestId?: string;
  traceId?: string;
  userId?: string;
  threadId?: string;
  messageId?: string;
  connectorId?: string;
  provider?: string;
  model?: string;
  latencyMs?: number;
  errorCode?: string;
  errorMessage?: string;
  errorStack?: string;
  metadata?: Record<string, unknown>;
}

export interface ServerLogFilters {
  level?: string;
  serviceName?: string;
  module?: string;
  controller?: string;
  action?: string;
  requestId?: string;
  traceId?: string;
  userId?: string;
  threadId?: string;
  provider?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface AggregationResult {
  _id: string;
  count: number;
}

export interface ServerLogStatsResponse {
  byLevel: AggregationResult[];
  byService: AggregationResult[];
  byAction: AggregationResult[];
  total: number;
}

export interface CreateServerLogResponse {
  id: string;
}

export interface BatchCreateServerLogsResponse {
  inserted: number;
}
