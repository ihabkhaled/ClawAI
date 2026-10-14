import type { AuthKind } from '../../../common/enums/auth-kind.enum';
import type { RiskLevel } from '../../../common/enums/risk-level.enum';
import type { ServerState } from '../../../common/enums/server-status.enum';
import type { Prisma } from '../../../generated/prisma';
import type { SERVER_SELECT } from '../constants/server-query.constants';
import type { SnapshotTool } from './mcp-tool-snapshot.types';

export type ServerToolRecord = {
  name: string;
  localName: string;
  description: string;
  inputSchema: unknown;
  schemaHash: string;
  riskLevel: RiskLevel;
  enabled: boolean;
  consentGranted: boolean;
};

export type ServerRecord = {
  id: string;
  ownerUserId: string;
  slug: string;
  name: string;
  url: string;
  urlHost: string;
  authKind: AuthKind;
  status: ServerState;
  serverInfo: unknown;
  toolsHash: string | null;
  lastCheckedAt: Date | null;
  lastErrorCode: string | null;
  failureCount: number;
  breakerOpenedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  credential: { kind: AuthKind; updatedAt: Date } | null;
  tools: ServerToolRecord[];
};

export type CreateServerInput = {
  id: string;
  ownerUserId: string;
  slug: string;
  name: string;
  url: string;
  urlHost: string;
  authKind: AuthKind;
  status: ServerState;
  serverInfo: Record<string, string> | null;
  toolsHash: string;
  tools: SnapshotTool[];
  /** Sealed in the same transaction as the server, so a server never exists half-configured. */
  credential?: SealedServerCredential;
};

export type SealedServerCredential = {
  kind: AuthKind;
  headerName: string;
  ciphertext: string;
  keyVersion: number;
};

export type CreateServerOutcome =
  { kind: 'CREATED' } | { kind: 'LIMIT'; current: number } | { kind: 'DUPLICATE' };

/** What a refresh keeps from the old snapshot for a tool whose definition did not change. */
export type ToolSettings = { riskLevel: RiskLevel; enabled: boolean; consentGranted: boolean };

export type ToolUpdate = Partial<ToolSettings>;

export type ServerToolIdentity = { id: string; slug: string; status: ServerState };

export type SealedCredentialRecord = {
  kind: AuthKind;
  headerName: string;
  ciphertext: string;
};

export type SnapshotWrite = {
  tools: Array<SnapshotTool & ToolSettings>;
  toolsHash: string;
  serverInfo: Record<string, string> | null;
  status: ServerState;
};

export type ServerRow = Prisma.McpServerGetPayload<{ select: typeof SERVER_SELECT }>;
