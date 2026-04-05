export const SERVICE_URLS: Record<string, string> = {
  "auth-service": "http://auth-service:4001/api/v1/health",
  "chat-service": "http://chat-service:4002/api/v1/health",
  "connector-service": "http://connector-service:4003/api/v1/health",
  "routing-service": "http://routing-service:4004/api/v1/health",
  "memory-service": "http://memory-service:4005/api/v1/health",
  "file-service": "http://file-service:4006/api/v1/health",
  "audit-service": "http://audit-service:4007/api/v1/health",
  "ollama-service": "http://ollama-service:4008/api/v1/health",
  "client-logs-service": "http://client-logs-service:4010/api/v1/health",
  "server-logs-service": "http://server-logs-service:4011/api/v1/health",
};

export const HEALTH_CHECK_TIMEOUT_MS = 5000;
