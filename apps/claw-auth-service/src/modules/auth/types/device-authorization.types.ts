import type { TokenPair } from './token-session.types';

export interface DeviceClient {
  name: string;
  version: string;
}

export interface DeviceAuthorizationCreated {
  deviceCode: string;
  userCode: string;
  expiresIn: number;
  interval: number;
}

export type DeviceAuthorizationError =
  | { error: 'authorization_pending' }
  | { error: 'slow_down'; interval: number }
  | { error: 'access_denied' }
  | { error: 'expired_token' };

export type DeviceAuthorizationExchange = TokenPair | DeviceAuthorizationError;
