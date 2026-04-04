export interface ServiceHealthResult {
  name: string;
  status: "up" | "down";
  responseTimeMs: number | null;
  error: string | null;
}

export interface AggregatedHealth {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  services: ServiceHealthResult[];
  summary: {
    total: number;
    up: number;
    down: number;
  };
}
