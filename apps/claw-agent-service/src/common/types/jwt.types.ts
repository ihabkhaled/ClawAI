import type { DeviceTokenClass } from '@claw/shared-types';

export type AccessTokenClaims = {
  sub: string;
  deviceId: string;
  scopes: string[];
  jti: string;
  orgId?: string | null;
  /** F097. Decided by WHICH KEY verified the token, never by a claim the caller could set. */
  tokenClass: DeviceTokenClass;
};

export type SignedAccessToken = {
  token: string;
  expiresIn: number;
  issuedAt: number;
};
