export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  CHAT: '/chat',
  CHAT_THREAD: (threadId: string) => `/chat/${threadId}` as const,
  CONNECTORS: '/connectors',
  CONNECTOR_DETAIL: (connectorId: string) => `/connectors/${connectorId}` as const,
  MODELS: '/models',
  MODELS_CATALOG: '/models/catalog',
  ROUTING: '/routing',
  ROUTING_REPLAY: '/routing/replay',
  MEMORY: '/memory',
  CONTEXT: '/context',
  FILES: '/files',
  AUDITS: '/audits',
  LOGS: '/logs',
  OBSERVABILITY: '/observability',
  SETTINGS: '/settings',
  ADMIN: '/admin',
} as const;

export const PUBLIC_ROUTES = [ROUTES.LOGIN] as const;
