import type { AuthKind } from '../../../common/enums/auth-kind.enum';
import type { RiskLevel } from '../../../common/enums/risk-level.enum';
import type { ServerState } from '../../../common/enums/server-status.enum';
import type { SkippedTool, ToolDiff } from './mcp-tool-snapshot.types';

/** One tool of a user's server as the owner sees it. */
export type McpServerToolView = {
  /** The name the owner and the API use: the local name. */
  name: string;
  /** What the model is offered: plugin_<slug>_<name>. */
  nativeName: string;
  /** The name the server itself uses. Informational. */
  remoteName: string;
  description: string;
  inputSchema: unknown;
  riskLevel: RiskLevel;
  enabled: boolean;
  /** The owner's stored grant for a WRITE tool. DESTRUCTIVE is asked on every call and is never stored. */
  consentGranted: boolean;
};

export type McpServerView = {
  id: string;
  slug: string;
  name: string;
  url: string;
  urlHost: string;
  authKind: AuthKind;
  status: ServerState;
  hasCredential: boolean;
  credentialUpdatedAt: string | null;
  toolCount: number;
  toolsHash: string | null;
  serverInfo: { name: string; version: string } | null;
  lastCheckedAt: string | null;
  /** A stable code (MCP_SERVER_UNREACHABLE or MCP_SERVER_REJECTED), never a detail. */
  lastErrorCode: string | null;
  createdAt: string;
  updatedAt: string;
};

export type McpServerDetailView = McpServerView & { tools: McpServerToolView[] };

/** The answer to registering a server: the server, and the tools the owner is being asked to trust. */
export type McpServerRegisteredView = {
  server: McpServerDetailView;
  skippedTools: SkippedTool[];
  ignoredTools: number;
};

export type McpServerRefreshView = {
  changed: boolean;
  diff: ToolDiff | null;
  server: McpServerDetailView;
  skippedTools: SkippedTool[];
  ignoredTools: number;
};
