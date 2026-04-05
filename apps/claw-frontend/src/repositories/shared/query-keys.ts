export const queryKeys = {
  auth: {
    me: ["auth", "me"] as const,
  },
  threads: {
    all: ["threads"] as const,
    lists: () => [...queryKeys.threads.all, "list"] as const,
    list: (filters: Record<string, unknown>) =>
      [...queryKeys.threads.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.threads.all, "detail", id] as const,
    messages: (threadId: string, page?: number) =>
      [...queryKeys.threads.all, "messages", threadId, page] as const,
  },
  connectors: {
    all: ["connectors"] as const,
    lists: () => [...queryKeys.connectors.all, "list"] as const,
    list: (filters: Record<string, unknown>) =>
      [...queryKeys.connectors.lists(), filters] as const,
    detail: (id: string) =>
      [...queryKeys.connectors.all, "detail", id] as const,
    models: (id: string) =>
      [...queryKeys.connectors.all, "models", id] as const,
  },
  models: {
    all: ["models"] as const,
  },
  routing: {
    config: ["routing", "config"] as const,
    policies: {
      all: ["routing", "policies"] as const,
      lists: () => [...queryKeys.routing.policies.all, "list"] as const,
      list: (filters: Record<string, unknown>) =>
        [...queryKeys.routing.policies.lists(), filters] as const,
    },
    decisions: {
      all: ["routing", "decisions"] as const,
      byThread: (threadId: string) =>
        [...queryKeys.routing.decisions.all, threadId] as const,
    },
  },
  localModels: {
    all: ["localModels"] as const,
    lists: () => [...queryKeys.localModels.all, "list"] as const,
  },
  runtimes: {
    all: ["runtimes"] as const,
  },
  audits: {
    all: ["audits"] as const,
    lists: () => [...queryKeys.audits.all, "list"] as const,
    list: (params: Record<string, unknown>) =>
      [...queryKeys.audits.lists(), params] as const,
    stats: ["audits", "stats"] as const,
  },
  usage: {
    all: ["usage"] as const,
    lists: () => [...queryKeys.usage.all, "list"] as const,
    list: (params: Record<string, unknown>) =>
      [...queryKeys.usage.lists(), params] as const,
    summary: ["usage", "summary"] as const,
    cost: ["usage", "cost"] as const,
    latency: ["usage", "latency"] as const,
  },
  admin: {
    users: ["admin", "users"] as const,
  },
  memory: {
    all: ["memory"] as const,
    lists: () => [...queryKeys.memory.all, "list"] as const,
    list: (filters: Record<string, unknown>) =>
      [...queryKeys.memory.lists(), filters] as const,
    detail: (id: string) =>
      [...queryKeys.memory.all, "detail", id] as const,
  },
  contextPacks: {
    all: ["contextPacks"] as const,
    lists: () => [...queryKeys.contextPacks.all, "list"] as const,
    detail: (id: string) =>
      [...queryKeys.contextPacks.all, "detail", id] as const,
  },
  files: {
    all: ["files"] as const,
    lists: () => [...queryKeys.files.all, "list"] as const,
    list: (filters: Record<string, unknown>) =>
      [...queryKeys.files.lists(), filters] as const,
    detail: (id: string) =>
      [...queryKeys.files.all, "detail", id] as const,
    chunks: (id: string) =>
      [...queryKeys.files.all, "chunks", id] as const,
  },
  health: {
    all: ["health"] as const,
    aggregated: ["health", "aggregated"] as const,
  },
  dashboard: {
    all: ["dashboard"] as const,
    stats: ["dashboard", "stats"] as const,
  },
} as const;
