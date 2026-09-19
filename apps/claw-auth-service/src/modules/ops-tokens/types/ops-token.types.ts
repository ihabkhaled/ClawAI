import type { OpsTokenScope } from '../../../common/enums';

/** An ops token as the admin page lists it. Never carries the token or its hash. */
export interface OpsTokenView {
  id: string;
  name: string;
  tokenPrefix: string;
  scopes: OpsTokenScope[];
  createdByUserId: string;
  expiresAt: string;
  lastUsedAt: string | null;
  useCount: number;
  revokedAt: string | null;
  createdAt: string;
  active: boolean;
}

/** Returned once, at creation: the only time the token exists in clear. */
export interface CreatedOpsToken {
  token: string;
  view: OpsTokenView;
}

/** What an internal verify returns to a service holding a presented token. */
export interface OpsTokenVerification {
  valid: boolean;
  tokenId: string | null;
  scopes: OpsTokenScope[];
}
