// ---- RabbitMQ ----

export const EXCHANGE_NAME = 'claw.events';
export const RABBITMQ_QUEUE_PREFIX = 'claw';

// ---- Service Ports ----

export const AUTH_SERVICE_PORT = 4001;
export const CHAT_SERVICE_PORT = 4002;
export const CONNECTOR_SERVICE_PORT = 4003;
export const ROUTING_SERVICE_PORT = 4004;
export const MEMORY_SERVICE_PORT = 4005;
export const FILE_SERVICE_PORT = 4006;
export const AUDIT_SERVICE_PORT = 4007;
export const OLLAMA_SERVICE_PORT = 4008;
export const HEALTH_SERVICE_PORT = 4009;
export const IMAGE_SERVICE_PORT = 4012;
export const FILE_GENERATION_SERVICE_PORT = 4013;
export const WORKSPACE_SERVICE_PORT = 4014;
export const AGENT_SERVICE_PORT = 4015;
export const RESEARCH_SERVICE_PORT = 4016;
export const LLAMACPP_SERVICE_PORT = 4017;

// ---- Service Names ----

export const AUTH_SERVICE = 'auth-service';
export const CHAT_SERVICE = 'chat-service';
export const CONNECTOR_SERVICE = 'connector-service';
export const ROUTING_SERVICE = 'routing-service';
export const MEMORY_SERVICE = 'memory-service';
export const FILE_SERVICE = 'file-service';
export const AUDIT_SERVICE = 'audit-service';
export const OLLAMA_SERVICE = 'ollama-service';
export const HEALTH_SERVICE = 'health-service';
export const IMAGE_SERVICE = 'image-service';
export const FILE_GENERATION_SERVICE = 'file-generation-service';
export const WORKSPACE_SERVICE = 'workspace-service';
export const AGENT_SERVICE = 'agent-service';
export const RESEARCH_SERVICE = 'research-service';
export const LLAMACPP_SERVICE = 'llamacpp-service';

// ---- API ----

export const API_PREFIX = 'api/v1';

// ---- Pagination Defaults ----

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// ---- HTTP Defaults (used by @claw/shared-utilities http-client) ----

export const DEFAULT_HTTP_TIMEOUT = 30_000;
export const LONG_HTTP_TIMEOUT = 120_000;

// ---- JWT (used by @claw/shared-utilities jwt-verifier) ----

export const JWT_ALGORITHM = 'HS256' as const;
