export type AccessTokenClaims = {
  sub: string;
  deviceId: string;
  scopes: string[];
  jti: string;
  orgId?: string | null;
};

export type SignedAccessToken = {
  token: string;
  expiresIn: number;
  issuedAt: number;
};
