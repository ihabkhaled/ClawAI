import type {
  WorkspaceConnector,
  WorkspaceHealthEvent,
  WorkspaceObject,
  WorkspaceObjectLink,
  WorkspaceSyncRun,
} from '../../../generated/prisma';
import type { WorkspaceConnectorStatus } from '../../../common/enums/workspace-connector-status.enum';
import type { WorkspaceObjectType } from '../../../common/enums/workspace-object-type.enum';
import type { WorkspaceProvider } from '../../../common/enums/workspace-provider.enum';

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

export type OAuthStatePayload = {
  userId: string;
  provider: string;
  providerAppConfigId: string;
  redirectUri: string;
  verifier: string | undefined;
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

export type WorkspaceSearchResult = {
  id: string;
  title: string;
  type: string;
  provider: string;
  url: string | null;
  snippet: string | null;
  score: number;
  externalId: string;
  connectorId: string;
  externalCreatedAt: Date | null;
};

export type WorkspaceSearchResponse = {
  results: WorkspaceSearchResult[];
  total: number;
  query: string;
};

export type WorkspaceSearchFilters = {
  types?: WorkspaceObjectType[];
  providers?: WorkspaceProvider[];
};

export type WriteActionResult = {
  success: boolean;
  externalId?: string;
  url?: string;
  metadata?: Record<string, unknown>;
  errorMessage?: string;
};

/**
 * Provider-native object details fetched live (not from the synced cache).
 * Returned by `WorkspaceAdapter.fetchObjectDetails` and consumed by the
 * operations-center refresh flow.
 */
export type LiveObjectDetails = {
  externalId: string;
  title: string | null;
  content: string | null;
  url: string | null;
  authorId: string | null;
  externalCreatedAt: Date | null;
  externalUpdatedAt: Date | null;
  metadata: Record<string, unknown>;
};

/**
 * v3 round 11 (2026-05-14) — Prompt 08: a streamable file payload from a
 * file-backed provider (Google Drive / OneDrive / SharePoint). `body` is
 * a web ReadableStream so the controller can pipe it straight to the
 * HTTP response without buffering the whole file in memory.
 */
export type FileContentStream = {
  filename: string;
  mimeType: string;
  // Total size in bytes when the provider reports it; null when unknown
  // (e.g. chunked transfer). The controller sets Content-Length only when
  // this is non-null.
  sizeBytes: number | null;
  body: ReadableStream<Uint8Array>;
};
