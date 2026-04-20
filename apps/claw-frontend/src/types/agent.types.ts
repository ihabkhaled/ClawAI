import type {
  AgentSessionStatus,
  DeviceScope,
  DeviceStatus,
  FileEventType,
  RiskLabel,
  TerminalCommandStatus,
} from '../enums';

export type AgentSession = {
  id: string;
  userId: string;
  hostname: string;
  platform: string;
  agentVersion: string;
  status: AgentSessionStatus;
  lastHeartbeatAt: string | null;
  connectedAt: string;
  disconnectedAt: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    commands: number;
    repos: number;
    fileEvents: number;
  };
};

export type RegisterSessionResult = AgentSession & {
  sessionKey: string;
};

export type TerminalCommand = {
  id: string;
  sessionId: string;
  userId: string;
  command: string;
  workingDir: string | null;
  status: TerminalCommandStatus;
  riskScore: number;
  riskLabel: RiskLabel;
  matchedPolicyId: string | null;
  riskReasons: string | null;
  autoApproved: boolean;
  blockedByPolicy: boolean;
  stdout: string | null;
  stderr: string | null;
  exitCode: number | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  rejectionReason: string | null;
  requestedAt: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
};

export type LocalRepo = {
  id: string;
  sessionId: string;
  userId: string;
  repoPath: string;
  name: string;
  branch: string | null;
  commitHash: string | null;
  isDirty: boolean;
  fileCount: number;
  lastScannedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type FileWatchEvent = {
  id: string;
  sessionId: string;
  userId: string;
  eventType: FileEventType;
  filePath: string;
  repoId: string | null;
  createdAt: string;
};

export type PaginatedAgentSessions = {
  data: AgentSession[];
  total: number;
  page: number;
  pageSize: number;
};

export type PaginatedCommands = {
  data: TerminalCommand[];
  total: number;
  page: number;
  pageSize: number;
};

export type PaginatedRepos = {
  data: LocalRepo[];
  total: number;
  page: number;
  pageSize: number;
};

export type PaginatedFileEvents = {
  data: FileWatchEvent[];
  total: number;
  page: number;
  pageSize: number;
};

export type CreateCommandRequest = {
  sessionId: string;
  command: string;
  workingDir?: string;
  ttlSeconds?: number;
};

export type RejectCommandRequest = {
  reason: string;
};

export type ListSessionsQuery = {
  page?: number;
  pageSize?: number;
};

export type ListCommandsQuery = {
  sessionId?: string;
  status?: TerminalCommandStatus;
  page?: number;
  pageSize?: number;
};

export type ListReposQuery = {
  sessionId?: string;
  page?: number;
  pageSize?: number;
};

export type ListEventsQuery = {
  sessionId?: string;
  page?: number;
  pageSize?: number;
};

// ---- Phase A: Device / Auth ----

export type Device = {
  id: string;
  userId: string;
  orgId: string | null;
  name: string;
  hostname: string;
  os: string;
  platform: string;
  agentVersion: string;
  scopes: DeviceScope[];
  status: DeviceStatus;
  lastSeenAt: string | null;
  lastIp: string | null;
  revokedAt: string | null;
  revokeReason: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

export type DeviceWithCounts = Device & {
  _count: {
    sessions: number;
    refreshTokens: number;
  };
};

export type PaginatedDevices = {
  data: Device[];
  total: number;
  page: number;
  pageSize: number;
};

export type ApprovePairingRequest = {
  pairingCode: string;
  scopes: DeviceScope[];
  deviceName?: string;
};

export type DenyPairingRequest = {
  pairingCode: string;
};

export type UpdateDeviceRequest = {
  name?: string;
  scopes?: DeviceScope[];
};

export type RevokeDeviceRequest = {
  reason?: string;
};

export type ListDevicesQuery = {
  status?: DeviceStatus;
  page?: number;
  pageSize?: number;
};
