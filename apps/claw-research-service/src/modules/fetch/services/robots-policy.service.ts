import { Injectable, Logger } from '@nestjs/common';

import {
  crawlDelayFor,
  isPathAllowed,
  parseRobotsTxt,
} from '../../../common/utilities/robots-txt.utility';
import { RobotsTxtAdapter } from '../adapters/robots-txt.adapter';
import {
  ROBOTS_CACHE_MAX_ENTRIES,
  ROBOTS_CACHE_TTL_MS,
  ROBOTS_MAX_CRAWL_DELAY_MS,
  ROBOTS_UNREACHABLE_CACHE_TTL_MS,
  ROBOTS_USER_AGENT_TOKEN,
} from '../constants/robots-policy.constants';
import { RobotsOutcome } from '../enums/robots-outcome.enum';
import type { RobotsCacheEntry, RobotsDecision } from '../types/robots-policy.types';

/**
 * robots.txt, honoured on EVERY fetch (ADR-121 invariant), not only inside a
 * site crawl. RFC 9309 semantics:
 *
 * - 2xx → the rules for `ClawAI-ResearchBot` (or `*`) decide the path.
 * - 4xx (after a TLS-impersonated retry for 401/403/503) → no rules, allowed.
 * - 5xx or unreachable → complete disallow of the origin; only the
 *   off-origin public archive may run.
 *
 * One robots.txt per origin per hour, in process memory (bounded; oldest
 * origin evicted first). robots.txt itself is always fetchable — the
 * site-crawl workflow reads it through the same fetch path.
 */
@Injectable()
export class RobotsPolicyService {
  private readonly logger = new Logger(RobotsPolicyService.name);
  private readonly cache = new Map<string, RobotsCacheEntry>();

  constructor(private readonly robotsAdapter: RobotsTxtAdapter) {}

  async evaluate(rawUrl: string): Promise<RobotsDecision> {
    const url = new URL(rawUrl);
    const robotsUrl = `${url.origin}/robots.txt`;
    if (url.pathname === '/robots.txt') {
      return { outcome: RobotsOutcome.ALLOWED, robotsUrl, crawlDelayMs: null };
    }
    const entry = await this.load(url.origin, robotsUrl);
    if (entry.unreachable) {
      return { outcome: RobotsOutcome.UNREACHABLE, robotsUrl, crawlDelayMs: null };
    }
    if (entry.rules === null) {
      return { outcome: RobotsOutcome.ALLOWED, robotsUrl, crawlDelayMs: null };
    }
    const allowed = isPathAllowed(
      entry.rules,
      ROBOTS_USER_AGENT_TOKEN,
      `${url.pathname}${url.search}`,
    );
    const delaySeconds = crawlDelayFor(entry.rules, ROBOTS_USER_AGENT_TOKEN);
    return {
      outcome: allowed ? RobotsOutcome.ALLOWED : RobotsOutcome.DISALLOWED,
      robotsUrl,
      crawlDelayMs:
        delaySeconds === null ? null : Math.min(delaySeconds * 1_000, ROBOTS_MAX_CRAWL_DELAY_MS),
    };
  }

  private async load(origin: string, robotsUrl: string): Promise<RobotsCacheEntry> {
    const cached = this.cache.get(origin);
    if (cached !== undefined && cached.expiresAt > Date.now()) {
      return cached;
    }
    const outcome = await this.robotsAdapter.fetchRobotsTxt(robotsUrl);
    const status = outcome.status;
    let entry: RobotsCacheEntry;
    if (status !== null && status >= 200 && status < 300) {
      entry = {
        rules: parseRobotsTxt(outcome.body ?? ''),
        unreachable: false,
        expiresAt: Date.now() + ROBOTS_CACHE_TTL_MS,
      };
    } else if (status !== null && status >= 400 && status < 500) {
      entry = { rules: null, unreachable: false, expiresAt: Date.now() + ROBOTS_CACHE_TTL_MS };
    } else {
      entry = {
        rules: null,
        unreachable: true,
        expiresAt: Date.now() + ROBOTS_UNREACHABLE_CACHE_TTL_MS,
      };
    }
    this.logger.log(
      `robots.txt ${robotsUrl}: status=${String(status)} via=${outcome.via} unreachable=${String(entry.unreachable)}`,
    );
    this.remember(origin, entry);
    return entry;
  }

  private remember(origin: string, entry: RobotsCacheEntry): void {
    this.cache.delete(origin);
    if (this.cache.size >= ROBOTS_CACHE_MAX_ENTRIES) {
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) {
        this.cache.delete(oldest);
      }
    }
    this.cache.set(origin, entry);
  }
}
