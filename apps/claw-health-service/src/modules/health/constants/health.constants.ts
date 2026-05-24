export const SERVICE_URLS: Record<string, string> = {
  'auth-service': 'https://auth-service:4001/api/v1/health',
  'chat-service': 'https://chat-service:4002/api/v1/health',
  'connector-service': 'https://connector-service:4003/api/v1/health',
  'routing-service': 'https://routing-service:4004/api/v1/health',
  'memory-service': 'https://memory-service:4005/api/v1/health',
  'file-service': 'https://file-service:4006/api/v1/health',
  'audit-service': 'https://audit-service:4007/api/v1/health',
  'ollama-service': 'https://ollama-service:4008/api/v1/health',
  'client-logs-service': 'https://client-logs-service:4010/api/v1/health',
  'server-logs-service': 'https://server-logs-service:4011/api/v1/health',
  'image-service': 'https://image-service:4012/api/v1/health',
  'file-generation-service': 'https://file-generation-service:4013/api/v1/health',
  'workspace-service': 'https://workspace-service:4014/api/v1/health',
  'agent-service': 'https://agent-service:4015/api/v1/health',
  'research-service': 'https://research-service:4016/api/v1/health',
  'llamacpp-service': 'https://llamacpp-service:4017/api/v1/health',
};

export const HEALTH_CHECK_TIMEOUT_MS = 5000;
