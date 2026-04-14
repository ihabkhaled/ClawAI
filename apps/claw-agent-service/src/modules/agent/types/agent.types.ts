import type {
  AgentSession,
  FileWatchEvent,
  LocalRepo,
  TerminalCommand,
} from '../../../generated/prisma';

// sessionKey is NEVER exposed in user-facing responses (security: returned once at register only)
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
