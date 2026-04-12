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
  modelName?: string;
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
  page?: number;
  limit?: number;
}

export interface AggregationResult {
  _id: string;
  count: number;
}

export interface DistinctValuesResult {
  field: string;
  values: string[];
}

export interface TimeSeriesBucket {
  timestamp: string;
  count: number;
}

export interface ServerLogStatsResponse {
  byLevel: AggregationResult[];
  byService: AggregationResult[];
  byAction: AggregationResult[];
  byMethod: AggregationResult[];
  byStatusCode: AggregationResult[];
  byModule: AggregationResult[];
  total: number;
  errorCount: number;
  avgLatencyMs: number;
}

export interface CreateServerLogResponse {
  id: string;
}

export interface BatchCreateServerLogsResponse {
  inserted: number;
}
