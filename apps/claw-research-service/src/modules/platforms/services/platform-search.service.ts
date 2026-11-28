import { randomUUID } from 'node:crypto';

import { Injectable, Logger } from '@nestjs/common';

import { ResearchUsageService } from '../../../common/services/research-usage.service';
import { sha1Short } from '../../../common/utilities/hash.utility';
import { PlatformApiKind, type ResearchPlatform } from '../../../generated/prisma';
import { PlatformApiAdapterFactory } from '../adapters/platform-api-adapter.factory';
import {
  PLATFORM_API_MAX_RESULTS,
  PLATFORM_PROVIDER_KIND_PREFIX,
} from '../constants/platform-api.constants';
import { ResearchPlatformRepository } from '../repositories/research-platform.repository';
import { classifyPlatformError } from '../utilities/classify-platform-error.utility';
import type {
  PlatformApiHit,
  PlatformApiJob,
  PlatformApiOutcome,
  PlatformApiRequest,
  PlatformTaggedResult,
} from '../types/platform.types';

/**
 * Runs official-API platforms (research engine B3). Every call is bounded by
 * its row's `timeoutMs` (one deadline for the whole call, PubMed's two requests
 * included), never rejects, records one `WEB_SEARCH` unit per network request
 * through the same `ResearchUsageService` the search adapters use, and logs one
 * `research.platform` debug line: slug, ok, count, ms, code. Never the query.
 */
@Injectable()
export class PlatformSearchService {
  private readonly logger = new Logger(PlatformSearchService.name);

  constructor(
    private readonly repository: ResearchPlatformRepository,
    private readonly factory: PlatformApiAdapterFactory,
    private readonly researchUsage: ResearchUsageService,
  ) {}

  /** Every enabled platform, priority order: one query per platform run. */
  loadEnabled(): Promise<ResearchPlatform[]> {
    return this.repository.findEnabled();
  }

  /**
   * The given API platforms, all in parallel; Wikipedia once per language in
   * `wikipediaLanguages`. Resolves when every call has settled.
   */
  runApiPlatforms(
    userId: string,
    platforms: readonly ResearchPlatform[],
    query: string,
    wikipediaLanguages: readonly string[],
  ): Promise<PlatformApiOutcome[]> {
    const batch = randomUUID();
    let calls = 0;
    const meter = (slug: string) => async (): Promise<void> => {
      calls += 1;
      await this.researchUsage.record(
        userId,
        'WEB_SEARCH',
        `platform:${batch}:${slug}:${String(calls)}`,
      );
    };
    const jobs = platforms.flatMap((platform): PlatformApiJob[] =>
      platform.apiKind === PlatformApiKind.WIKIPEDIA
        ? wikipediaLanguages.map((language) => ({ platform, language }))
        : [{ platform, language: null }],
    );
    return Promise.all(
      jobs.map(({ platform, language }) =>
        this.callOne(
          platform,
          { query, maxResults: platform.maxResults, language },
          meter(platform.slug),
        ),
      ),
    );
  }

  /** One platform call. Never rejects: a failure is `ok: false` with a stable code. */
  async callOne(
    platform: ResearchPlatform,
    request: PlatformApiRequest,
    onNetworkCall?: () => Promise<void>,
  ): Promise<PlatformApiOutcome> {
    const started = Date.now();
    const maxResults = Math.min(Math.max(1, request.maxResults), PLATFORM_API_MAX_RESULTS);
    const base = {
      slug: platform.slug,
      name: platform.name,
      category: platform.category,
      language: request.language,
    };
    try {
      if (platform.apiKind === null) {
        throw new Error(`Platform ${platform.slug} has no API kind`);
      }
      const hits = await this.factory
        .getAdapter(platform.apiKind)
        .search(
          { ...request, maxResults },
          { signal: AbortSignal.timeout(platform.timeoutMs), onNetworkCall },
        );
      const results = this.toResults(platform, hits.slice(0, maxResults));
      return this.settle({
        ...base,
        ok: true,
        results,
        latencyMs: Date.now() - started,
        errorCode: null,
      });
    } catch (error) {
      const errorCode = classifyPlatformError(error);
      return this.settle({
        ...base,
        ok: false,
        results: [],
        latencyMs: Date.now() - started,
        errorCode,
      });
    }
  }

  private settle(outcome: PlatformApiOutcome): PlatformApiOutcome {
    this.logger.debug(
      `research.platform slug=${outcome.slug} ok=${String(outcome.ok)} count=${String(outcome.results.length)} ms=${String(outcome.latencyMs)} code=${outcome.errorCode ?? 'none'}`,
    );
    return outcome;
  }

  /** SearchResult-shaped, rank-scored, `providerKind` = `PLATFORM:<slug>`, platform stamped. */
  private toResults(
    platform: ResearchPlatform,
    hits: readonly PlatformApiHit[],
  ): PlatformTaggedResult[] {
    return hits.map((hit, index) => ({
      id: sha1Short(hit.url),
      title: hit.title,
      url: hit.url,
      snippet: hit.snippet,
      publishedAt: hit.publishedAt,
      freshness: null,
      score: 1 - index / Math.max(1, hits.length),
      providerKind: `${PLATFORM_PROVIDER_KIND_PREFIX}${platform.slug}`,
      platform: platform.slug,
      platformCategory: platform.category,
    }));
  }
}
