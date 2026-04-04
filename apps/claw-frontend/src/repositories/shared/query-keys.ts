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
    list: (params: Record<string, string>) =>
      ["audits", params] as const,
  },
} as const;
