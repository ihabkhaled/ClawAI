export type ActivityMemoryEntry = {
  id: string;
  userId: string;
  deviceId: string;
  kind: string;
  summary: string;
  occurredAt: string;
  syncedToCloud: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

export type ListActivityQuery = {
  page?: number;
  pageSize?: number;
  kind?: string;
};

export type PaginatedActivity = {
  data: ActivityMemoryEntry[];
  total: number;
  page: number;
  pageSize: number;
};

export type UseActivityMemoryPageReturn = {
  entries: ActivityMemoryEntry[];
  total: number;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
};
