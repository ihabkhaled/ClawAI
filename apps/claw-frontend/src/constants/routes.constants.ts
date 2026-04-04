export const ROUTES = {
  LOGIN: "/login",
  CHAT: "/chat",
  CHAT_THREAD: (threadId: string) => `/chat/${threadId}` as const,
  CONNECTORS: "/connectors",
  CONNECTOR_DETAIL: (connectorId: string) =>
    `/connectors/${connectorId}` as const,
  MODELS: "/models",
  ROUTING: "/routing",
  MEMORY: "/memory",
  CONTEXT: "/context",
  FILES: "/files",
  AUDITS: "/audits",
  OBSERVABILITY: "/observability",
  SETTINGS: "/settings",
  ADMIN: "/admin",
} as const;

export const PUBLIC_ROUTES = [ROUTES.LOGIN] as const;
