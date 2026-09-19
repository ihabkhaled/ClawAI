export interface OpsTokenVerification {
  valid: boolean;
  tokenId: string | null;
  scopes: string[];
}

export interface CachedOpsVerification {
  tokenId: string;
  expiresAt: number;
}
