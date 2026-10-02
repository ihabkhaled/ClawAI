import { HttpStatus, Injectable, Logger } from '@nestjs/common';

import { ResearchErrorCode } from '../../../common/enums/research-error-code.enum';
import { BusinessException } from '../../../common/errors/business.exception';
import { EntityNotFoundException } from '../../../common/errors/entity-not-found.exception';
import { describeFetchFailure } from '../../../common/utilities/describe-fetch-failure.utility';
import { toInputJson } from '../../../common/utilities/prisma-json.utility';
import { assertSafeOutboundUrl } from '../../../common/utilities/url-safety.utility';
import { FetchService } from '../../fetch/services/fetch.service';
import { SiteCrawlManager } from '../../research/managers/site-crawl.manager';
import {
  type RuntimeCrawlConfig,
  RuntimeCrawlProfile,
  type RuntimeCrawlRun,
  RuntimeCrawlStatus,
} from '../../../generated/prisma';
import {
  RUNTIME_CRAWL_DEFAULT_PAGES_PAGE_SIZE,
  RUNTIME_CRAWL_REFUSAL_CODES,
} from '../constants/runtime-crawl.constants';
import { RuntimeCrawlPageRepository } from '../repositories/runtime-crawl-page.repository';
import { RuntimeCrawlRunRepository } from '../repositories/runtime-crawl-run.repository';
import { RuntimeCrawlConfigService } from '../services/runtime-crawl-config.service';
import { RuntimeCrawlLimitsService } from '../services/runtime-crawl-limits.service';
import {
  boundWarnings,
  toPageRow,
  toPageView,
  toRunView,
} from '../utilities/runtime-crawl-page.utility';
import type { RuntimeCrawlPagesQueryDto } from '../dto/runtime-crawl-pages-query.dto';
import type { StartRuntimeCrawlDto } from '../dto/start-runtime-crawl.dto';
import type { EvidenceItem } from '../../research/types/evidence-bundle.types';
import type {
  RuntimeCrawlEffectiveLimits,
  RuntimeCrawlPagesView,
  RuntimeCrawlRawPage,
  RuntimeCrawlRunView,
  RuntimeCrawlStartView,
} from '../types/runtime-crawl.types';

/**
 * Runs the EXISTING crawler and fetcher for an authenticated runtime client.
 *
 * Nothing here fetches on its own: every page goes through `FetchService`
 * (robots.txt, domain policy, SSRF-checked redirects, size and time caps,
 * WEB_FETCH metering per live page), and a crawl is `SiteCrawlManager.crawl`,
 * the same call the web app's research loop makes. This class adds only what
 * a user-facing surface needs on top: owner scoping, hard per-user caps,
 * a persisted run the client can poll, and an honest failure record.
 */
@Injectable()
export class RuntimeCrawlManager {
  private readonly logger = new Logger(RuntimeCrawlManager.name);

  constructor(
    private readonly configService: RuntimeCrawlConfigService,
    private readonly limits: RuntimeCrawlLimitsService,
    private readonly runs: RuntimeCrawlRunRepository,
    private readonly pages: RuntimeCrawlPageRepository,
    private readonly crawler: SiteCrawlManager,
    private readonly fetchService: FetchService,
  ) {}

  /**
   * `extract` is answered in the response; `crawl` returns the RUNNING run at
   * once and finishes after the response (the client polls). Research never
   * runs inside the POST (rule 50 item 5).
   */
  async start(userId: string, dto: StartRuntimeCrawlDto): Promise<RuntimeCrawlStartView> {
    this.assertSafeStartUrl(dto.url);
    const config = await this.configService.get();
    const limits = await this.limits.resolve(userId, dto, config);
    const profile =
      dto.profile === 'extract' ? RuntimeCrawlProfile.EXTRACT : RuntimeCrawlProfile.CRAWL;
    const run = await this.runs.create({
      userId,
      profile,
      startUrl: dto.url,
      intent: dto.intent ?? '',
      maxPages: limits.maxPages,
      maxDepth: limits.maxDepth,
    });
    this.logger.log(
      `runtime_crawl.start run=${run.id} user=${userId} profile=${profile} maxPages=${String(limits.maxPages)} maxDepth=${String(limits.maxDepth)}`,
    );
    if (profile === RuntimeCrawlProfile.EXTRACT) {
      return this.runExtract(run, config);
    }
    void this.runCrawl(run, limits, config);
    return { run: toRunView(run), page: null };
  }

  async getRun(userId: string, id: string): Promise<RuntimeCrawlRunView> {
    return toRunView(await this.getOwned(userId, id));
  }

  async listRuns(userId: string, limit: number): Promise<RuntimeCrawlRunView[]> {
    return (await this.runs.listByUser(userId, limit)).map(toRunView);
  }

  async getPages(
    userId: string,
    id: string,
    query: RuntimeCrawlPagesQueryDto,
  ): Promise<RuntimeCrawlPagesView> {
    const run = await this.getOwned(userId, id);
    const limit = query.limit ?? RUNTIME_CRAWL_DEFAULT_PAGES_PAGE_SIZE;
    const rows = await this.pages.listAfter(run.id, query.after, limit);
    const page = rows.slice(0, limit);
    const last = page.at(-1);
    return {
      runId: run.id,
      status: run.status,
      pages: page.map(toPageView),
      nextAfter: rows.length > limit && last !== undefined ? last.ordinal : null,
    };
  }

  private async getOwned(userId: string, id: string): Promise<RuntimeCrawlRun> {
    const run = await this.runs.findOwned(id, userId);
    if (run === null) {
      throw new EntityNotFoundException('RuntimeCrawlRun', id);
    }
    return run;
  }

  /**
   * The cheap syntactic SSRF check, applied before a run row exists. It is
   * only the first layer: `FetchService` re-checks the URL and every redirect
   * hop, and a hostname that resolves private is that layer's job (TD-031).
   */
  private assertSafeStartUrl(url: string): void {
    try {
      assertSafeOutboundUrl(url, { allowPrivateHosts: false });
    } catch (error) {
      throw new BusinessException(
        'research.runtimeCrawl.unsafeUrl',
        ResearchErrorCode.UNSAFE_URL,
        HttpStatus.BAD_REQUEST,
        { message: error instanceof Error ? error.message : 'Unsafe URL' },
      );
    }
  }

  private async runExtract(
    run: RuntimeCrawlRun,
    config: RuntimeCrawlConfig,
  ): Promise<RuntimeCrawlStartView> {
    try {
      const result = await this.fetchService.fetchPage(run.userId, { url: run.startUrl });
      const row = toPageRow(
        {
          url: result.finalUrl,
          title: result.title,
          text: result.content,
          links: result.links,
          discoveryMethod: 'user',
        },
        0,
        { maxTextChars: config.maxTextCharsPerPage, maxLinks: config.maxLinksPerPage },
      );
      await this.pages.createMany(run.id, [row]);
      const done = await this.finish(run.id, RuntimeCrawlStatus.COMPLETED, 1, [], null);
      return {
        run: toRunView(done),
        page: toPageView({ ...row, id: '', runId: run.id, createdAt: new Date() }),
      };
    } catch (error) {
      const failed = await this.fail(
        run.id,
        this.codeOf(error),
        describeFetchFailure(error),
        0,
        [],
      );
      return { run: toRunView(failed), page: null };
    }
  }

  private async runCrawl(
    run: RuntimeCrawlRun,
    limits: RuntimeCrawlEffectiveLimits,
    config: RuntimeCrawlConfig,
  ): Promise<void> {
    const warnings: string[] = [];
    let timer: NodeJS.Timeout | undefined;
    try {
      const timeout = new Promise<'timeout'>((resolve) => {
        timer = setTimeout(() => resolve('timeout'), config.runTimeoutSeconds * 1000);
      });
      const crawl = this.crawler.crawl(
        run.userId,
        run.startUrl,
        [],
        [],
        warnings,
        undefined,
        limits.maxPages,
        run.intent,
        limits.maxDepth,
      );
      const outcome = await Promise.race([crawl, timeout]);
      if (outcome === 'timeout') {
        // The crawler cannot be aborted: it drains in the background, bounded
        // by its page budget, and whatever it read after this point is dropped.
        crawl.catch(() => {});
        await this.fail(
          run.id,
          ResearchErrorCode.RUNTIME_CRAWL_TIMEOUT,
          `The crawl did not finish within ${String(config.runTimeoutSeconds)} seconds and was stopped.`,
          0,
          warnings,
        );
        return;
      }
      await this.storeOutcome(run, outcome, warnings, config);
    } catch (error) {
      this.logger.warn(`runtime_crawl.failed run=${run.id}: ${describeFetchFailure(error)}`);
      await this.fail(
        run.id,
        ResearchErrorCode.RUNTIME_CRAWL_FAILED,
        'The crawl failed unexpectedly. Nothing was fabricated; pages read before the failure were not kept.',
        0,
        warnings,
      ).catch(() => {});
    } finally {
      clearTimeout(timer);
    }
  }

  private async storeOutcome(
    run: RuntimeCrawlRun,
    items: EvidenceItem[],
    warnings: string[],
    config: RuntimeCrawlConfig,
  ): Promise<void> {
    if (items.length === 0) {
      const reason = warnings[0] ?? 'No page could be read.';
      await this.fail(run.id, this.codeFromWarning(reason), reason, 0, warnings);
      return;
    }
    const rows = items.map((item, ordinal) =>
      toPageRow(this.rawFromEvidence(item), ordinal, {
        maxTextChars: config.maxTextCharsPerPage,
        maxLinks: config.maxLinksPerPage,
      }),
    );
    await this.pages.createMany(run.id, rows);
    await this.finish(run.id, RuntimeCrawlStatus.COMPLETED, rows.length, warnings, null);
    this.logger.log(`runtime_crawl.completed run=${run.id} pages=${String(rows.length)}`);
  }

  private rawFromEvidence(item: EvidenceItem): RuntimeCrawlRawPage {
    const method = item.structured?.['crawlDiscoveryMethod'];
    return {
      url: item.url,
      title: item.title,
      text: item.snippet,
      links: [],
      discoveryMethod: typeof method === 'string' ? method : 'unknown',
    };
  }

  private codeOf(error: unknown): string {
    return error instanceof BusinessException ? error.code : ResearchErrorCode.RUNTIME_CRAWL_FAILED;
  }

  private codeFromWarning(warning: string): string {
    return (
      RUNTIME_CRAWL_REFUSAL_CODES.find((code) => warning.includes(code)) ??
      ResearchErrorCode.RUNTIME_CRAWL_NO_PAGES_READ
    );
  }

  private finish(
    id: string,
    status: RuntimeCrawlStatus,
    pagesFetched: number,
    warnings: string[],
    errorCode: string | null,
  ): Promise<RuntimeCrawlRun> {
    return this.runs.update(id, {
      status,
      pagesFetched,
      errorCode,
      warnings: toInputJson(boundWarnings(warnings)),
      completedAt: new Date(),
    });
  }

  private fail(
    id: string,
    errorCode: string,
    errorMessage: string,
    pagesFetched: number,
    warnings: string[],
  ): Promise<RuntimeCrawlRun> {
    return this.runs.update(id, {
      status: RuntimeCrawlStatus.FAILED,
      pagesFetched,
      errorCode,
      errorMessage: errorMessage.slice(0, 500),
      warnings: toInputJson(boundWarnings(warnings)),
      completedAt: new Date(),
    });
  }
}
