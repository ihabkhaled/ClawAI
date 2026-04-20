import type { Dispatch, FormEvent, SetStateAction } from 'react';

import type { WorkspaceActionStatus } from '../enums/workspace-action-status.enum';
import type { WorkspaceActionType } from '../enums/workspace-action-type.enum';
import type { WorkspaceConnectorStatus } from '../enums/workspace-connector-status.enum';
import type { WorkspaceObjectType } from '../enums/workspace-object-type.enum';
import type { WorkspacePermissionLevel } from '../enums/workspace-permission-level.enum';
import type { WorkspaceProvider } from '../enums/workspace-provider.enum';

import type { TranslateFunction } from './i18n.types';

export type WorkspaceConnector = {
  id: string;
  userId: string;
  name: string;
  provider: WorkspaceProvider;
  status: WorkspaceConnectorStatus;
  permissionLevel: string;
  scopes: string[];
  expiresAt: string | null;
  lastSyncAt: string | null;
  isEnabled: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  _count: {
    syncRuns: number;
    healthEvents: number;
  };
  healthEvents: WorkspaceHealthEvent[];
};

export type WorkspaceHealthEvent = {
  id: string;
  connectorId: string;
  status: WorkspaceConnectorStatus;
  latencyMs: number | null;
  errorMessage: string | null;
  checkedAt: string;
};

export type PaginatedWorkspaceConnectors = {
  data: WorkspaceConnector[];
  total: number;
  page: number;
  pageSize: number;
};

export type CreateWorkspaceConnectorRequest = {
  name: string;
  provider: WorkspaceProvider;
  permissionLevel?: string;
  accessToken?: string;
  refreshToken?: string;
  scopes?: string[];
  metadata?: Record<string, unknown>;
};

export type UpdateWorkspaceConnectorRequest = {
  name?: string;
  permissionLevel?: string;
  isEnabled?: boolean;
  scopes?: string[];
};

export type OAuthInitRequest = {
  provider: WorkspaceProvider;
  redirectUri: string;
  scopes?: string[];
};

export type OAuthInitResult = {
  authorizationUrl: string;
  state: string;
};

export type WorkspaceHealthCheckResult = {
  status: WorkspaceConnectorStatus;
  latencyMs: number;
  errorMessage?: string;
};

export type WorkspaceSyncResult = {
  objectsFound: number;
  objectsSynced: number;
  objectsFailed: number;
  errorMessage?: string;
};

export type WorkspaceObjectDetailProps = {
  object: WorkspaceObject;
  isRefreshing: boolean;
  refreshError: Error | null;
  onRefresh: () => void;
  t: TranslateFunction;
};

export type WorkspaceSyncRun = {
  id: string;
  connectorId: string;
  status: string;
  objectType: string;
  isDelta: boolean;
  deltaTokenIn: string | null;
  deltaTokenOut: string | null;
  objectsFound: number;
  objectsSynced: number;
  objectsFailed: number;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
};

export type ListWorkspaceConnectorsQuery = {
  page?: number;
  pageSize?: number;
  provider?: WorkspaceProvider;
  status?: WorkspaceConnectorStatus;
  isEnabled?: boolean;
};

export type WorkspaceConnectorFormFieldErrors = Record<string, string[] | undefined>;

export type WorkspaceConnectorFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (dto: CreateWorkspaceConnectorRequest) => void;
  isPending: boolean;
  t: TranslateFunction;
};

export type WorkspaceConnectorFormStateParams = {
  open: boolean;
  onSubmit: (dto: CreateWorkspaceConnectorRequest) => void;
  onOpenChange: (open: boolean) => void;
};

export type WorkspaceConnectorFormStateReturn = {
  name: string;
  setName: Dispatch<SetStateAction<string>>;
  provider: WorkspaceProvider;
  setProvider: Dispatch<SetStateAction<WorkspaceProvider>>;
  permissionLevel: WorkspacePermissionLevel;
  setPermissionLevel: Dispatch<SetStateAction<WorkspacePermissionLevel>>;
  fieldErrors: WorkspaceConnectorFormFieldErrors;
  pendingLabel: string;
  submitLabel: string;
  handleSubmit: (event: FormEvent) => void;
  handleOpenChange: (open: boolean) => void;
};

export type WorkspaceObject = {
  id: string;
  connectorId: string;
  userId: string;
  externalId: string;
  type: WorkspaceObjectType;
  title: string;
  content: string | null;
  url: string | null;
  authorId: string | null;
  provider: WorkspaceProvider;
  metadata: Record<string, unknown>;
  externalCreatedAt: string | null;
  externalUpdatedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type WorkspaceObjectLink = {
  id: string;
  sourceObjectId: string;
  targetObjectId: string;
  externalRef: string | null;
  linkType: string;
  confidence: number;
  createdAt: string;
};

export type PaginatedWorkspaceObjects = {
  data: WorkspaceObject[];
  total: number;
  page: number;
  pageSize: number;
};

export type ListWorkspaceObjectsQuery = {
  page?: number;
  limit?: number;
  connectorId?: string;
  type?: WorkspaceObjectType;
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
  externalCreatedAt: string | null;
};

export type WorkspaceSearchQuery = {
  query: string;
  limit?: number;
  types?: WorkspaceObjectType[];
  providers?: WorkspaceProvider[];
};

export type WorkspaceSearchResponse = {
  results: WorkspaceSearchResult[];
  total: number;
  query: string;
};

export type WorkspaceActionConnector = {
  id: string;
  name: string;
  provider: WorkspaceProvider;
};

export type WorkspaceAction = {
  id: string;
  userId: string;
  connectorId: string;
  actionType: WorkspaceActionType;
  status: WorkspaceActionStatus;
  payload: Record<string, unknown>;
  result: Record<string, unknown> | null;
  errorMessage: string | null;
  rejectionReason: string | null;
  requestedAt: string;
  reviewedAt: string | null;
  executedAt: string | null;
  expiresAt: string | null;
  reviewedBy: string | null;
  connector: WorkspaceActionConnector;
};

export type PaginatedWorkspaceActions = {
  data: WorkspaceAction[];
  total: number;
  page: number;
  pageSize: number;
};

export type CreateWorkspaceActionRequest = {
  connectorId: string;
  actionType: WorkspaceActionType;
  payload: Record<string, unknown>;
  expiresInHours?: number;
};

export type RejectWorkspaceActionRequest = {
  reason?: string;
};

export type ListWorkspaceActionsQuery = {
  page?: number;
  pageSize?: number;
  status?: WorkspaceActionStatus;
  connectorId?: string;
};
