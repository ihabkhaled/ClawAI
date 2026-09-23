/** Who a scoped token is for and who issued it — both are verified. */
export interface ScopedTokenAudience {
  audience: string;
  issuer: string;
}

export interface ScopedTokenSignOptions extends ScopedTokenAudience {
  expiresInSeconds: number;
}
