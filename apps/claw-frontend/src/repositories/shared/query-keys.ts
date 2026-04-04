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
    detail: (id: string) => ["connectors", id] as const,
  },
  models: {
    all: ["models"] as const,
  },
  routing: {
    config: ["routing", "config"] as const,
  },
  audits: {
    all: ["audits"] as const,
    list: (params: Record<string, string>) =>
      ["audits", params] as const,
  },
} as const;
