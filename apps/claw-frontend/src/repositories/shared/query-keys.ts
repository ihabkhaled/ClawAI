export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  threads: {
    all: ['threads'] as const,
    lists: () => [...queryKeys.threads.all, 'list'] as const,
    list: (filters: Record<string, unknown>) => [...queryKeys.threads.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.threads.all, 'detail', id] as const,
    messages: (threadId: string, page?: number) =>
      [...queryKeys.threads.all, 'messages', threadId, page] as const,
    messagesInfinite: (threadId: string) =>
      [...queryKeys.threads.all, 'messages-infinite', threadId] as const,
    listInfinite: (filters: Record<string, unknown>) =>
      [...queryKeys.threads.lists(), 'infinite', filters] as const,
  },
  connectors: {
    all: ['connectors'] as const,
    lists: () => [...queryKeys.connectors.all, 'list'] as const,
    list: (filters: Record<string, unknown>) => [...queryKeys.connectors.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.connectors.all, 'detail', id] as const,
    models: (id: string) => [...queryKeys.connectors.all, 'models', id] as const,
  },
  models: {
    all: ['models'] as const,
  },
  routing: {
    config: ['routing', 'config'] as const,
    policies: {
      all: ['routing', 'policies'] as const,
      lists: () => [...queryKeys.routing.policies.all, 'list'] as const,
      list: (filters: Record<string, unknown>) =>
        [...queryKeys.routing.policies.lists(), filters] as const,
    },
    decisions: {
      all: ['routing', 'decisions'] as const,
      byThread: (threadId: string) => [...queryKeys.routing.decisions.all, threadId] as const,
    },
    recovery: (limit: number) => ['routing', 'recovery', limit] as const,
  },
  localModels: {
    all: ['localModels'] as const,
    lists: () => [...queryKeys.localModels.all, 'list'] as const,
  },
  runtimes: {
    all: ['runtimes'] as const,
  },
  clientLogs: {
    all: ['clientLogs'] as const,
    lists: () => [...queryKeys.clientLogs.all, 'list'] as const,
    list: (params: Record<string, unknown>) => [...queryKeys.clientLogs.lists(), params] as const,
    stats: ['clientLogs', 'stats'] as const,
  },
  serverLogs: {
    all: ['serverLogs'] as const,
    lists: () => [...queryKeys.serverLogs.all, 'list'] as const,
    list: (params: Record<string, unknown>) => [...queryKeys.serverLogs.lists(), params] as const,
    stats: ['serverLogs', 'stats'] as const,
  },
  audits: {
    all: ['audits'] as const,
    lists: () => [...queryKeys.audits.all, 'list'] as const,
    list: (params: Record<string, unknown>) => [...queryKeys.audits.lists(), params] as const,
    stats: ['audits', 'stats'] as const,
  },
  usage: {
    all: ['usage'] as const,
    lists: () => [...queryKeys.usage.all, 'list'] as const,
    list: (params: Record<string, unknown>) => [...queryKeys.usage.lists(), params] as const,
    summary: ['usage', 'summary'] as const,
    cost: ['usage', 'cost'] as const,
    latency: ['usage', 'latency'] as const,
  },
  admin: {
    users: ['admin', 'users'] as const,
  },
  memory: {
    all: ['memory'] as const,
    lists: () => [...queryKeys.memory.all, 'list'] as const,
    list: (filters: Record<string, unknown>) => [...queryKeys.memory.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.memory.all, 'detail', id] as const,
  },
  contextPacks: {
    all: ['contextPacks'] as const,
    lists: () => [...queryKeys.contextPacks.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.contextPacks.all, 'detail', id] as const,
  },
  files: {
    all: ['files'] as const,
    lists: () => [...queryKeys.files.all, 'list'] as const,
    list: (filters: Record<string, unknown>) => [...queryKeys.files.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.files.all, 'detail', id] as const,
    chunks: (id: string) => [...queryKeys.files.all, 'chunks', id] as const,
  },
  health: {
    all: ['health'] as const,
    aggregated: ['health', 'aggregated'] as const,
  },
  dashboard: {
    all: ['dashboard'] as const,
    stats: ['dashboard', 'stats'] as const,
  },
  catalog: {
    all: ['catalog'] as const,
    lists: () => [...queryKeys.catalog.all, 'list'] as const,
    list: (filters: Record<string, unknown>) => [...queryKeys.catalog.lists(), filters] as const,
    listInfinite: (filters: Record<string, unknown>) =>
      [...queryKeys.catalog.lists(), 'infinite', filters] as const,
    detail: (id: string) => [...queryKeys.catalog.all, 'detail', id] as const,
  },
  pullJobs: {
    all: ['pullJobs'] as const,
  },
  workspaceProviders: {
    all: ['workspaceProviders'] as const,
    catalog: () => ['workspaceProviders', 'catalog'] as const,
    detail: (provider: string) => ['workspaceProviders', 'detail', provider] as const,
  },
  workspaceProviderAppConfigs: {
    all: ['workspaceProviderAppConfigs'] as const,
    list: (provider?: string) =>
      ['workspaceProviderAppConfigs', 'list', provider ?? 'all'] as const,
    detail: (id: string) => ['workspaceProviderAppConfigs', 'detail', id] as const,
  },
  discovery: {
    all: ['discovery'] as const,
    sources: {
      all: ['discovery', 'sources'] as const,
      detail: (id: string) => ['discovery', 'sources', id] as const,
    },
    runs: {
      all: ['discovery', 'runs'] as const,
      list: (filters: Record<string, unknown>) => ['discovery', 'runs', 'list', filters] as const,
      detail: (id: string) => ['discovery', 'runs', id] as const,
    },
    candidates: {
      all: ['discovery', 'candidates'] as const,
      list: (filters: Record<string, unknown>) =>
        ['discovery', 'candidates', 'list', filters] as const,
    },
    packs: {
      all: ['discovery', 'packs'] as const,
    },
  },
  replay: {
    all: ['replay'] as const,
    runs: {
      all: () => ['replay', 'runs'] as const,
      cases: (runId: string) => ['replay', 'runs', runId, 'cases'] as const,
      compare: (runId1: string, runId2: string) =>
        ['replay', 'runs', 'compare', runId1, runId2] as const,
      list: (params?: Record<string, unknown>) => ['replay', 'runs', 'list', params] as const,
      suspicious: (runId: string) => ['replay', 'runs', runId, 'suspicious'] as const,
    },
  },
  adaptiveLearning: {
    all: ['adaptive-learning'] as const,
    insights: (windowDays: number) => ['adaptive-learning', 'insights', windowDays] as const,
  },
  workspaceConnectors: {
    all: ['workspaceConnectors'] as const,
    lists: () => [...queryKeys.workspaceConnectors.all, 'list'] as const,
    list: (filters: Record<string, unknown>) =>
      [...queryKeys.workspaceConnectors.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.workspaceConnectors.all, 'detail', id] as const,
    syncRuns: (id: string) => [...queryKeys.workspaceConnectors.all, 'syncRuns', id] as const,
    healthEvents: (id: string) =>
      [...queryKeys.workspaceConnectors.all, 'healthEvents', id] as const,
  },
  workspaceSyncHealth: {
    all: ['workspaceSyncHealth'] as const,
    dashboard: () => [...queryKeys.workspaceSyncHealth.all, 'dashboard'] as const,
  },
  workspaceObjects: {
    all: ['workspaceObjects'] as const,
    lists: () => [...queryKeys.workspaceObjects.all, 'list'] as const,
    list: (filters: Record<string, unknown>) =>
      [...queryKeys.workspaceObjects.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.workspaceObjects.all, 'detail', id] as const,
  },
  workspaceSearch: {
    all: ['workspaceSearch'] as const,
    results: (query: string) => [...queryKeys.workspaceSearch.all, 'results', query] as const,
  },
  workspaceActions: {
    all: ['workspaceActions'] as const,
    lists: () => [...queryKeys.workspaceActions.all, 'list'] as const,
    list: (filters: Record<string, unknown>) =>
      [...queryKeys.workspaceActions.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.workspaceActions.all, 'detail', id] as const,
  },
  agentSessions: {
    all: ['agentSessions'] as const,
    lists: () => [...queryKeys.agentSessions.all, 'list'] as const,
    list: (filters: Record<string, unknown>) =>
      [...queryKeys.agentSessions.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.agentSessions.all, 'detail', id] as const,
  },
  agentCommands: {
    all: ['agentCommands'] as const,
    lists: () => [...queryKeys.agentCommands.all, 'list'] as const,
    list: (filters: Record<string, unknown>) =>
      [...queryKeys.agentCommands.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.agentCommands.all, 'detail', id] as const,
  },
  agentRepos: {
    all: ['agentRepos'] as const,
    lists: () => [...queryKeys.agentRepos.all, 'list'] as const,
    list: (filters: Record<string, unknown>) => [...queryKeys.agentRepos.lists(), filters] as const,
  },
  agentEvents: {
    all: ['agentEvents'] as const,
    lists: () => [...queryKeys.agentEvents.all, 'list'] as const,
    list: (filters: Record<string, unknown>) =>
      [...queryKeys.agentEvents.lists(), filters] as const,
  },
  devices: {
    all: ['devices'] as const,
    lists: () => [...queryKeys.devices.all, 'list'] as const,
    list: (filters: Record<string, unknown>) => [...queryKeys.devices.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.devices.all, 'detail', id] as const,
  },
  researchProviders: {
    all: ['researchProviders'] as const,
    list: () => ['researchProviders', 'list'] as const,
    detail: (id: string) => ['researchProviders', 'detail', id] as const,
  },
  researchRuns: {
    all: ['researchRuns'] as const,
    list: (limit: number) => ['researchRuns', 'list', limit] as const,
    detail: (id: string) => ['researchRuns', 'detail', id] as const,
  },
} as const;
