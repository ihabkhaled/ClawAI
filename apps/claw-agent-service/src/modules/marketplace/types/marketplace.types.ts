import type { MarketplaceListing } from '../../../generated/prisma';

export type JwkKey = {
  kty: 'OKP';
  crv: 'Ed25519';
  x: string;
  d?: string;
};

export type PaginatedListings = {
  data: MarketplaceListing[];
  total: number;
  page: number;
  pageSize: number;
};

export type SignedRecipePayload = {
  dsl: Record<string, unknown>;
  signaturePublicKey: string;
  signature: string;
};
