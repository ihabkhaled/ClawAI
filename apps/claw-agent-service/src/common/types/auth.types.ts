import type { IncomingMessage } from 'node:http';

export type AuthenticatedUser = { id: string; email: string; role: string };
export type AgentAuthContext = { sessionId: string; userId: string };
export type AgentRequest = IncomingMessage & { agentSession: AgentAuthContext };
