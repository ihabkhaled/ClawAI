import type {
  WorkspaceConnector,
  WorkspaceHealthEvent,
  WorkspaceSyncRun,
} from '../../../generated/prisma';
import type { WorkspaceConnectorStatus } from '../../../common/enums/workspace-connector-status.enum';

export type WorkspaceConnectorWithStats = WorkspaceConnector & {
  _count: {
    syncRuns: number;
    healthEvents: number;
  };
  healthEvents: WorkspaceHealthEvent[];
};

export type PaginatedWorkspaceConnectors = {
  data: WorkspaceConnectorWithStats[];
  total: number;
  page: number;
  pageSize: number;
};

export type OAuthTokenSet = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scopes: string[];
};

export type OAuthCallbackParams = {
  code: string;
  state: string;
  redirectUri: string;
};

export type OAuthInitParams = {
  provider: string;
  userId: string;
  redirectUri: string;
  scopes?: string[];
};

export type OAuthInitResult = {
  authorizationUrl: string;
  state: string;
};

export type HealthCheckResult = {
  status: WorkspaceConnectorStatus;
  latencyMs: number;
  errorMessage?: string;
};

export type SyncResult = {
  objectsFound: number;
  objectsSynced: number;
  objectsFailed: number;
  deltaTokenOut?: string;
  errorMessage?: string;
};

export type AdapterCapabilities = {
  supportsOAuth: boolean;
  supportsPat: boolean;
  supportsDeltaSync: boolean;
  supportsWebhooks: boolean;
  objectTypes: string[];
};

export type RateLimitState = {
  remaining: number;
  resetAt: Date;
  limit: number;
};

export type WorkspaceSyncRunWithConnector = WorkspaceSyncRun & {
  connector: Pick<WorkspaceConnector, 'id' | 'name' | 'provider'>;
};
