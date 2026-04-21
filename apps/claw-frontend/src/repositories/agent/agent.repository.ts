import { apiClient } from '../../services/shared/api-client';
import type {
  AgentSession,
  CancelCommandRequest,
  CreateCommandRequest,
  ListCommandsQuery,
  ListEventsQuery,
  ListReposQuery,
  ListSessionsQuery,
  PaginatedAgentSessions,
  PaginatedCommands,
  PaginatedFileEvents,
  PaginatedRepos,
  RejectCommandRequest,
  TerminalCommand,
} from '../../types/agent.types';

const BASE = '/agent';

export async function listAgentSessions(
  query?: ListSessionsQuery,
): Promise<PaginatedAgentSessions> {
  const params = new URLSearchParams();
  if (query?.page !== undefined) {
    params.set('page', String(query.page));
  }
  if (query?.pageSize !== undefined) {
    params.set('pageSize', String(query.pageSize));
  }
  const qs = params.toString();
  const response = await apiClient.get<PaginatedAgentSessions>(
    `${BASE}/sessions${qs ? `?${qs}` : ''}`,
  );
  return response.data;
}

export async function getAgentSession(id: string): Promise<AgentSession> {
  const response = await apiClient.get<AgentSession>(`${BASE}/sessions/${id}`);
  return response.data;
}

export async function disconnectSession(id: string): Promise<AgentSession> {
  const response = await apiClient.post<AgentSession>(`${BASE}/sessions/${id}/disconnect`, {});
  return response.data;
}

export async function listCommands(query?: ListCommandsQuery): Promise<PaginatedCommands> {
  const params = new URLSearchParams();
  if (query?.sessionId !== undefined) {
    params.set('sessionId', query.sessionId);
  }
  if (query?.status !== undefined) {
    params.set('status', query.status);
  }
  if (query?.page !== undefined) {
    params.set('page', String(query.page));
  }
  if (query?.pageSize !== undefined) {
    params.set('pageSize', String(query.pageSize));
  }
  const qs = params.toString();
  const response = await apiClient.get<PaginatedCommands>(`${BASE}/commands${qs ? `?${qs}` : ''}`);
  return response.data;
}

export async function createCommand(dto: CreateCommandRequest): Promise<TerminalCommand> {
  const response = await apiClient.post<TerminalCommand>(`${BASE}/commands`, dto);
  return response.data;
}

export async function getCommand(id: string): Promise<TerminalCommand> {
  const response = await apiClient.get<TerminalCommand>(`${BASE}/commands/${id}`);
  return response.data;
}

export async function approveCommand(id: string): Promise<TerminalCommand> {
  const response = await apiClient.post<TerminalCommand>(`${BASE}/commands/${id}/approve`, {});
  return response.data;
}

export async function rejectCommand(
  id: string,
  dto: RejectCommandRequest,
): Promise<TerminalCommand> {
  const response = await apiClient.post<TerminalCommand>(`${BASE}/commands/${id}/reject`, dto);
  return response.data;
}

export async function cancelCommand(
  id: string,
  dto: CancelCommandRequest,
): Promise<TerminalCommand> {
  const response = await apiClient.post<TerminalCommand>(`${BASE}/commands/${id}/cancel`, dto);
  return response.data;
}

export async function listRepos(query?: ListReposQuery): Promise<PaginatedRepos> {
  const params = new URLSearchParams();
  if (query?.sessionId !== undefined) {
    params.set('sessionId', query.sessionId);
  }
  if (query?.page !== undefined) {
    params.set('page', String(query.page));
  }
  if (query?.pageSize !== undefined) {
    params.set('pageSize', String(query.pageSize));
  }
  const qs = params.toString();
  const response = await apiClient.get<PaginatedRepos>(`${BASE}/repos${qs ? `?${qs}` : ''}`);
  return response.data;
}

export async function listEvents(query?: ListEventsQuery): Promise<PaginatedFileEvents> {
  const params = new URLSearchParams();
  if (query?.sessionId !== undefined) {
    params.set('sessionId', query.sessionId);
  }
  if (query?.page !== undefined) {
    params.set('page', String(query.page));
  }
  if (query?.pageSize !== undefined) {
    params.set('pageSize', String(query.pageSize));
  }
  const qs = params.toString();
  const response = await apiClient.get<PaginatedFileEvents>(`${BASE}/events${qs ? `?${qs}` : ''}`);
  return response.data;
}
