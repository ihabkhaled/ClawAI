import type {
  AgentSession,
  Device,
  DeviceCodeRequest,
  DeviceCodeStatus,
  DeviceStatus,
  FileWatchEvent,
  LocalRepo,
  PairingRequest,
  PairingStatus,
  RefreshToken,
  RefreshTokenStatus,
  TerminalCommand,
} from '../../../generated/prisma';
import type { DeviceCodeError } from '../../../common/enums/device-code-error.enum';
import type { DeviceScope } from '../../../common/enums/device-scope.enum';

export type AgentSessionPublic = Omit<AgentSession, 'sessionKey'>;

export type AgentSessionWithCounts = AgentSessionPublic & {
  _count: {
    commands: number;
    repos: number;
    fileEvents: number;
  };
};

export type RegisterSessionResult = AgentSession & {
  sessionKey: string;
};

export type PaginatedAgentSessions = {
  data: AgentSessionWithCounts[];
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

export type HeartbeatResult = {
  ok: boolean;
  nextHeartbeatInSeconds: number;
};

export type ReportEventsResult = {
  count: number;
};

export type ListEventsQuery = {
  sessionId?: string;
  page: number;
  pageSize: number;
};

// ---- Phase A: device / auth domain ----

export type DeviceHint = {
  name?: string;
  hostname: string;
  os: string;
  platform: string;
  agentVersion: string;
};

export type DevicePublic = {
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
  lastSeenAt: Date | null;
  lastIp: string | null;
  revokedAt: Date | null;
  revokeReason: string | null;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
};

export type DeviceWithCounts = DevicePublic & {
  _count: {
    sessions: number;
    refreshTokens: number;
  };
};

export type PaginatedDevices = {
  data: DevicePublic[];
  total: number;
  page: number;
  pageSize: number;
};

export type IssuedTokenPair = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

export type PairInitResult = {
  pairingCode: string;
  verificationUrl: string;
  expiresAt: Date;
  intervalSeconds: number;
};

export type PairPollResult = {
  status: 'pending' | 'approved' | 'denied' | 'expired';
  tokens?: IssuedTokenPair;
};

export type PairApproveResult = {
  deviceId: string;
};

export type DeviceCodeCreateResult = {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  verificationUriComplete: string;
  expiresIn: number;
  intervalSeconds: number;
};

export type DeviceCodeTokenResult =
  | { success: true; tokens: IssuedTokenPair }
  | { success: false; code: DeviceCodeError };

export type DeviceCodeTokenResponse = IssuedTokenPair | { error: DeviceCodeError };

export type AttachSessionResult = {
  sessionId: string;
  heartbeatIntervalSeconds: number;
};

export type ListDevicesQuery = {
  status?: DeviceStatus;
  page: number;
  pageSize: number;
};

// Re-export Prisma-generated enum values as runtime-usable (string) alias
export type { Device, RefreshToken, PairingRequest, DeviceCodeRequest };
export {
  DeviceCodeStatus as PrismaDeviceCodeStatus,
  DeviceStatus as PrismaDeviceStatus,
  PairingStatus as PrismaPairingStatus,
  RefreshTokenStatus as PrismaRefreshTokenStatus,
};
