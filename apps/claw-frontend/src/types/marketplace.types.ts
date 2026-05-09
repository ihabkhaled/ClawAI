import type { MarketplaceListingStatus } from '../enums/marketplace-listing-status.enum';
import type { SandboxFindingSeverity } from '../enums/sandbox-finding-severity.enum';
import type { SandboxResultStatus } from '../enums/sandbox-result-status.enum';

import type { RecipeDsl } from './recipe.types';

export type MarketplaceListing = {
  id: string;
  publisherUserId: string;
  recipeId: string | null;
  name: string;
  description: string | null;
  dsl: RecipeDsl;
  signaturePublicKey: string;
  signature: string;
  signatureAlgorithm: string;
  status: MarketplaceListingStatus;
  installs: number;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

export type ListMarketplaceQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
};

export type PaginatedListings = {
  data: MarketplaceListing[];
  total: number;
  page: number;
  pageSize: number;
};

export type SandboxFinding = {
  stepId: string;
  severity: SandboxFindingSeverity;
  code: string;
  message: string;
};

export type SandboxResult = {
  status: SandboxResultStatus;
  durationMs: number;
  staticFindings: SandboxFinding[];
  runtimeFindings: SandboxFinding[];
  error?: string;
};

export type UseMarketplacePageReturn = {
  listings: MarketplaceListing[];
  total: number;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  handleInstall: (id: string) => void;
  isInstalling: boolean;
};
