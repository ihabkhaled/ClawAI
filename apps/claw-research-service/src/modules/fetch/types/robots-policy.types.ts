import type { RobotsTxtResult } from '../../../common/types/robots-txt.types';
import type { RobotsOutcome } from '../enums/robots-outcome.enum';

/** The raw outcome of trying to download an origin's robots.txt. */
export type RobotsFetchOutcome = {
  /** HTTP status, or null when no response arrived at all. */
  status: number | null;
  body: string | null;
  /** Which client got the answer — plain, or TLS-impersonated after a 401/403. */
  via: 'plain' | 'impersonated';
};

/** A parsed robots.txt (or the lack of one), cached per origin. */
export type RobotsCacheEntry = {
  rules: RobotsTxtResult | null;
  unreachable: boolean;
  expiresAt: number;
};

/** The decision for one URL. */
export type RobotsDecision = {
  outcome: RobotsOutcome;
  robotsUrl: string;
  /** `Crawl-delay` for our token, in ms, capped; null when absent. */
  crawlDelayMs: number | null;
};
