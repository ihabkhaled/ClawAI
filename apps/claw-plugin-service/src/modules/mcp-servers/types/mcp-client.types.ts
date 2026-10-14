import type { McpFailureKind } from '../../../common/enums/mcp-failure-kind.enum';
import type { Deadline } from './deadline.types';

/** Where to talk to and how to authenticate. `headers` already carry the credential and must never be logged. */
export type McpEndpoint = {
  url: string;
  headers: Record<string, string>;
};

export type McpServerInfo = { name: string; version: string };

export type McpSession = {
  protocolVersion: string;
  sessionId: string | null;
  serverInfo: McpServerInfo | null;
};

export type McpDiscovery = {
  protocolVersion: string;
  serverInfo: McpServerInfo | null;
  /** Straight from the server: hostile until the snapshot manager has vetted each entry. */
  rawTools: unknown[];
  /** True when the server listed more tools than the pages we are willing to read. */
  moreAvailable: boolean;
};

export type McpCallParams = {
  remoteName: string;
  args: Record<string, unknown>;
  timeoutMs: number;
  maxResultBytes: number;
  signal?: AbortSignal;
};

export type McpCallResult = {
  /** The text blocks joined; everything else was dropped. */
  text: string;
  isError: boolean;
  droppedBlocks: number;
};

export type JsonRpcResponse = {
  id: number | string;
  result?: unknown;
  error?: { code: number; message: string };
};

export type McpFailureInfo = { kind: McpFailureKind; detail: string };

/** The state of one handshake-plus-call exchange with a server. Lives for one call. */
export type Exchange = {
  endpoint: McpEndpoint;
  deadline: Deadline;
  signal?: AbortSignal;
  session: McpSession | null;
  /** The Mcp-Session-Id the server issued in its initialize response, if any. */
  sessionHeader?: string;
  nextId: number;
};
