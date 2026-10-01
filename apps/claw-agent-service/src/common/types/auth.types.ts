import type { IncomingMessage } from 'node:http';
import type { DeviceTokenClass, MobileDeviceScope } from '@claw/shared-types';
import type { DeviceScope } from '../enums/device-scope.enum';

export type AuthenticatedUser = { id: string; email: string; role: string };

export type AgentAuthContext = { sessionId: string; userId: string; legacy?: boolean };

/** Every scope a device credential can carry: the desktop set plus the three mobile run scopes. */
export type AgentScope = DeviceScope | MobileDeviceScope;

export type DeviceContext = {
  deviceId: string;
  userId: string;
  scopes: AgentScope[];
  jti: string;
  orgId: string | null;
  /** F097. Taken from the device row, which the token has to agree with. */
  tokenClass: DeviceTokenClass;
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
