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

// ---- API ----

export const API_PREFIX = 'api/v1';

// ---- Pagination Defaults ----

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
