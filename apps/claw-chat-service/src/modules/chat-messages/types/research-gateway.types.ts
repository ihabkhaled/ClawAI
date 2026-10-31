import type { ResearchGatewayFailure } from '../enums/research-gateway-failure.enum';
import type { ResearchSearchEntry } from './research-enricher.types';

/**
 * One search provider's part in a search, from research-service's additive
 * `providers[]`. Every field is optional on the wire: the first deployments
 * send none of it, and the gateway must read the old shape unchanged.
 */
export type ResearchGatewayProvider = {
  id?: string;
  name: string;
  /** False when this provider failed or timed out while the others answered. */
  ok: boolean;
  resultCount?: number;
};

export type ResearchGatewaySearchInput = {
  query: string;
  maxResults: number;
  providerId?: string;
};

/** A search made with the caller's bearer token (user route). */
export type ResearchGatewayUserSearchInput = ResearchGatewaySearchInput & {
  authorization: string;
};

/** A search made on the service-token route, naming the user (no bearer in reach). */
export type ResearchGatewayInternalSearchInput = ResearchGatewaySearchInput & {
  userId: string;
};

export type ResearchGatewaySearchOutcome = {
  ok: boolean;
  failure?: ResearchGatewayFailure;
  status?: number;
  entries: ResearchSearchEntry[];
  /** research-service's own unit count; never derived from `providers.length` (rule 28). */
  requestCount: number;
  runId?: string | null;
  providerId?: string;
  providerName?: string;
  fallbackUsed?: boolean;
  /** `providers[]` when research-service sent it, else the providers it reports it attempted. */
  providers: ResearchGatewayProvider[];
  /** `mode` when research-service sent it (e.g. "ALL"), else undefined. */
  mode?: string;
  warnings: string[];
};

export type ResearchGatewayPage = {
  url: string;
  ok: boolean;
  failure?: ResearchGatewayFailure;
  status?: number;
  title?: string | null;
  content: string;
};
