import type { IncomingMessage } from 'node:http';
import type { DeviceScope } from '../enums/device-scope.enum';

export type AuthenticatedUser = { id: string; email: string; role: string };

export type AgentAuthContext = { sessionId: string; userId: string; legacy?: boolean };

export type DeviceContext = {
  deviceId: string;
  userId: string;
  scopes: DeviceScope[];
  jti: string;
  orgId: string | null;
};

export type AgentRequest = IncomingMessage & {
  agentSession?: AgentAuthContext;
  deviceContext?: DeviceContext;
  user?: AuthenticatedUser;
};

export type AgentRequestWithContext = AgentRequest & {
  params?: Record<string, string>;
  query?: Record<string, string | string[] | undefined>;
  body?: Record<string, unknown>;
};
