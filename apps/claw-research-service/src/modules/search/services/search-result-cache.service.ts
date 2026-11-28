import { Injectable, Logger } from '@nestjs/common';

import {
  SEARCH_CACHE_TTL_SECONDS,
  SEARCH_REDIS_TIMEOUT_MS,
} from '../../../common/constants/search.constants';
import { SearchProviderRunStatus } from '../../../common/enums/search-provider-run-status.enum';
import { RedisService } from '../../../infrastructure/redis/redis.service';
import type { SearchExecutionResult } from '../types/search-execution-result.types';

/**
 * Redis cache of merged search answers (research engine B2), 10 minutes.
 *
 * Only the research engine reads it (`SearchExecutionService.executeCached` /
 * `executeExpansion`); `POST /research/search` and old-shape research runs
 * never do. A hit makes no provider call and records no `WEB_SEARCH` unit.
 * Redis trouble (down, slow, bad value) is a miss: logged once at warn per
 * process, never an error for the search.
 */
@Injectable()
export class SearchResultCacheService {
  private readonly logger = new Logger(SearchResultCacheService.name);
  private warned = false;

  constructor(private readonly redis: RedisService) {}

  async read(key: string): Promise<SearchExecutionResult | null> {
    try {
      const raw = await this.redis.getBounded(key, SEARCH_REDIS_TIMEOUT_MS);
      if (raw === null) {
        return null;
      }
      const parsed = JSON.parse(raw) as SearchExecutionResult;
      const wellFormed = Array.isArray(parsed.results) && Array.isArray(parsed.providers);
      return wellFormed ? { ...parsed, cached: true, searchRequestCount: 0 } : null;
    } catch (error) {
      this.warnOnce(error);
      return null;
    }
  }

  /** Stores only a complete answer: every provider answered and something was found. */
  async write(key: string, result: SearchExecutionResult): Promise<void> {
    if (!this.isCacheable(result)) {
      return;
    }
    try {
      const { cached: _cached, ...stored } = result;
      await this.redis.setBounded(
        key,
        JSON.stringify(stored),
        SEARCH_CACHE_TTL_SECONDS,
        SEARCH_REDIS_TIMEOUT_MS,
      );
    } catch (error) {
      this.warnOnce(error);
    }
  }

  /**
   * A partial answer (a provider failed, timed out or was skipped) is not
   * cached, or the next 10 minutes would never retry the missing provider.
   */
  isCacheable(result: SearchExecutionResult): boolean {
    return (
      result.results.length > 0 &&
      result.providers.length > 0 &&
      result.providers.every((outcome) => outcome.status === SearchProviderRunStatus.OK)
    );
  }

  private warnOnce(error: unknown): void {
    if (this.warned) {
      return;
    }
    this.warned = true;
    this.logger.warn(
      `research.search_cache.unavailable treating as miss: ${error instanceof Error ? error.message : 'unknown'}`,
    );
  }
}
