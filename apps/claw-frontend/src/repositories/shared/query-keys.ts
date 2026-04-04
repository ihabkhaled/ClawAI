export const queryKeys = {
  auth: {
    me: ["auth", "me"] as const,
  },
  threads: {
    all: ["threads"] as const,
    detail: (id: string) => ["threads", id] as const,
    messages: (id: string) => ["threads", id, "messages"] as const,
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
