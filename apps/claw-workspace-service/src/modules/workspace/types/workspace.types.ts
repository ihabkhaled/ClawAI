import type {
  WorkspaceConnector,
  WorkspaceHealthEvent,
  WorkspaceObject,
  WorkspaceObjectLink,
  WorkspaceSyncRun,
} from '../../../generated/prisma';
import type { WorkspaceConnectorStatus } from '../../../common/enums/workspace-connector-status.enum';
import type { WorkspaceObjectType } from '../../../common/enums/workspace-object-type.enum';

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

export type SyncedObject = {
  externalId: string;
  type: WorkspaceObjectType;
  title: string;
  content?: string;
  url?: string;
  authorId?: string;
  metadata?: Record<string, unknown>;
  externalCreatedAt?: Date;
  externalUpdatedAt?: Date;
};

export type SyncResult = {
  objectsFound: number;
  objectsSynced: number;
  objectsFailed: number;
  deltaTokenOut?: string;
  errorMessage?: string;
  objects: SyncedObject[];
};

export type WorkspaceObjectWithLinks = WorkspaceObject & {
  sourceLinks: WorkspaceObjectLink[];
};

export type PaginatedWorkspaceObjects = {
  data: WorkspaceObject[];
  total: number;
  page: number;
  pageSize: number;
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
