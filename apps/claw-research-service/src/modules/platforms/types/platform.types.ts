import type { ResearchErrorCode } from '../../../common/enums/research-error-code.enum';
import type {
  PlatformAccessMethod,
  PlatformApiKind,
  PlatformCategory,
  ResearchPlatform,
} from '../../../generated/prisma';
import type { SearchResult } from '../../search/types/search.types';

/** One row of `PLATFORM_SEED`: what the boot seeder creates when the slug is missing. */
export type PlatformSeed = {
  slug: string;
  name: string;
  category: PlatformCategory;
  accessMethod: PlatformAccessMethod;
  apiKind: PlatformApiKind | null;
  domains: string[];
  languages: string[];
  priority: number;
  notes: string | null;
};

/** What an official-API adapter is asked. */
export type PlatformApiRequest = {
  query: string;
  maxResults: number;
  /** ISO 639 code; only the Wikipedia adapter uses it (its language edition). */
  language: string | null;
};

/** Per-call context: one deadline for the whole call, and the metering hook. */
export type PlatformApiContext = {
  signal: AbortSignal;
  /** Records one `WEB_SEARCH` unit; called once right before each network request. */
  onNetworkCall?: () => Promise<void>;
};

/** One hit as an adapter parsed it, before the service stamps the platform on it. */
export type PlatformApiHit = {
  title: string;
  url: string;
  /** Abstract/summary/description, markup stripped; null when the API gave none. */
  snippet: string | null;
  /** ISO date (or year) when the API reports one. */
  publishedAt: string | null;
};

/** Options of one allow-listed GET (`platformApiGet`). */
export type PlatformHttpOptions = {
  /** Upper-case API name for error messages (`OPENALEX API answered HTTP 429`). */
  label: string;
  accept: string;
  signal: AbortSignal;
  onNetworkCall?: () => Promise<void>;
};

/**
 * A search result that may carry the platform it came from. `providerKind` is a
 * plain string so a platform result can say `PLATFORM:<slug>`; every
 * `SearchResult` is one of these.
 */
export type PlatformTaggedResult = Omit<SearchResult, 'providerKind'> & {
  providerKind: string;
  /** Slug of the platform that returned it, or whose domain its host matches. */
  platform?: string;
  platformCategory?: PlatformCategory;
};

/** One planned API call: a platform, and the Wikipedia edition when it is Wikipedia. */
export type PlatformApiJob = {
  platform: ResearchPlatform;
  language: string | null;
};

/** How one official-API platform call ended. Never a query, URL body or error text. */
export type PlatformApiOutcome = {
  slug: string;
  name: string;
  category: PlatformCategory;
  /** The Wikipedia edition searched; null for every other API. */
  language: string | null;
  ok: boolean;
  results: PlatformTaggedResult[];
  latencyMs: number;
  errorCode: ResearchErrorCode | null;
};

/** `POST /research/platforms/:id/test`. */
export type PlatformTestResult = {
  slug: string;
  ok: boolean;
  resultCount: number;
  latencyMs: number;
  errorCode: string | null;
};
