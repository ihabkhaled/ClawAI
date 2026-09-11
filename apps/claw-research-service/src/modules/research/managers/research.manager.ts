import { Injectable, Logger } from '@nestjs/common';

import { EVIDENCE_FETCH_TOP_N } from '../../../common/constants/evidence.constants';
import { DIRECT_FETCH_CONFIDENCE } from '../../../common/constants/url-detection.constants';
import { clampSearchQuery } from '../../../common/utilities/search-query.utility';
import { detectUrlsInText } from '../../../common/utilities/url-detection.utility';
import { ProviderSelectionMode } from '../../../common/enums/provider-selection-mode.enum';
import { ResearchRunStatus } from '../../../common/enums/research-run-status.enum';
import { ResearchWorkflowKind } from '../../../common/enums/research-workflow-kind.enum';
import { sha1Short } from '../../../common/utilities/hash.utility';
import { FetchService } from '../../fetch/services/fetch.service';
import { ExtractionProfile } from '../../scrape/enums/extraction-profile.enum';
import { ScrapeService } from '../../scrape/services/scrape.service';
import { SearchExecutionService } from '../../search/services/search-execution.service';
import { ResearchRunRepository } from '../repositories/research-run.repository';
import { ResearchUsageService } from '../../../common/services/research-usage.service';
import { buildEvidenceBundle, traceEntry } from '../utilities/evidence-builder.utility';
import { SiteAuditManager } from './site-audit.manager';
import { SiteCrawlManager } from './site-crawl.manager';
import type { ExecuteResearchDto } from '../dto/execute-research.dto';
import type { Prisma, ResearchRun } from '../../../generated/prisma';
import type {
  EvidenceBundle,
  EvidenceItem,
  ResearchTraceEntry,
} from '../types/evidence-bundle.types';
import type { SearchResult } from '../../search/types/search.types';
import type { FetchResult } from '../../fetch/types/fetch.types';

@Injectable()
export class ResearchManager {
  private readonly logger = new Logger(ResearchManager.name);

  constructor(
    private readonly runs: ResearchRunRepository,
    private readonly searchService: SearchExecutionService,
    private readonly fetchService: FetchService,
    private readonly scrapeService: ScrapeService,
    private readonly researchUsage: ResearchUsageService,
    private readonly siteCrawlManager: SiteCrawlManager,
    private readonly siteAuditManager: SiteAuditManager,
  ) {}

  async run(userId: string, dto: ExecuteResearchDto): Promise<ResearchRun> {
    const run = await this.runs.create({
      userId,
      requestedModel: dto.requestedModel,
      requestedProvider: dto.requestedProvider,
      workflow: dto.workflow,
      intent: dto.intent,
      status: ResearchRunStatus.RUNNING,
    });

    const trace: ResearchTraceEntry[] = [];
    const warnings: string[] = [];
    const toolsUsed: string[] = [];
    const items: EvidenceItem[] = [];

    try {
      // A URL the user wrote is opened FIRST and on its own terms. It used to
      // reach the search engine as a keyword, so the page a person explicitly
      // named was fetched only if the engine happened to return it.
      const requestedUrls = detectUrlsInText(dto.intent);

      // SITE_CRAWL has no search step at all: it needs the URL to crawl and
      // nothing else, and none of the search/fetch/extract pipeline below
      // applies to it.
      if (dto.workflow === ResearchWorkflowKind.SITE_CRAWL) {
        return await this.runSiteCrawl(
          userId,
          requestedUrls,
          dto,
          run.id,
          trace,
          toolsUsed,
          warnings,
          items,
        );
      }

      const direct = await this.runDirectFetch(
        userId,
        requestedUrls,
        dto,
        trace,
        toolsUsed,
        warnings,
      );
      items.push(...direct.items);

      const search = await this.runSearch(userId, dto, trace, toolsUsed, warnings);
      items.push(...search.items);

      if (this.needsFetch(dto.workflow)) {
        // Never fetch a page twice in one run: a search hit for a URL the user
        // already pasted is the same page, and the direct fetch has the better
        // provenance.
        const alreadyFetched = new Set(direct.items.map((item) => item.url.toLowerCase()));
        const searchTargets = search.items.filter(
          (item) => !alreadyFetched.has(item.url.toLowerCase()),
        );
        const fetch = await this.runFetch(userId, searchTargets, trace, toolsUsed, warnings);
        items.push(...fetch.items);
        if (this.needsExtract(dto.workflow)) {
          await this.runExtract(
            userId,
            run.id,
            [...direct.items, ...fetch.items],
            new Map([...direct.rawByUrl, ...fetch.rawByUrl]),
            dto,
            trace,
            toolsUsed,
            warnings,
          );
        }
      }

      const bundle = this.finalize(dto, search.providerSelection, items, warnings, toolsUsed);
      return await this.completeRun(run.id, bundle, trace);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Research run ${run.id} failed: ${message}`);
      trace.push(traceEntry('run.failed', 'error', null, message));
      return this.failRun(run.id, trace, message);
    }
  }

  async getRun(id: string, userId: string): Promise<ResearchRun | null> {
    return this.runs.findById(id, userId);
  }

  async listRuns(userId: string, limit: number): Promise<ResearchRun[]> {
    return this.runs.listByUser(userId, limit);
  }

  /**
   * SITE_CRAWL short-circuits the rest of `run()`: it has no search provider,
   * so `providerSelection` reports `ProviderSelectionMode.NONE` rather than
   * inventing one.
   */
  private async runSiteCrawl(
    userId: string,
    requestedUrls: string[],
    dto: ExecuteResearchDto,
    runId: string,
    trace: ResearchTraceEntry[],
    toolsUsed: string[],
    warnings: string[],
    items: EvidenceItem[],
  ): Promise<ResearchRun> {
    const crawlUrl = requestedUrls[0];
    if (crawlUrl === undefined) {
      warnings.push('Crawl requested but the message contained no URL to crawl.');
    } else {
      const crawled = await this.siteCrawlManager.crawl(
        userId,
        crawlUrl,
        trace,
        toolsUsed,
        warnings,
      );
      items.push(...crawled);
    }
    const bundle = this.finalize(
      dto,
      {
        providerId: null,
        providerName: null,
        providerKind: null,
        selectionMode: ProviderSelectionMode.NONE,
        fallbackUsed: false,
        attemptedProviders: [],
      },
      items,
      warnings,
      toolsUsed,
    );
    // Computed from `bundle.items`, AFTER truncation/dedup — never from the
    // pre-bundle `items` array, so a finding can never cite an id that was
    // trimmed out of the bundle it ends up living in.
    const auditFindings = this.siteAuditManager.analyze(bundle.items);
    return this.completeRun(
      runId,
      auditFindings.length > 0 ? { ...bundle, auditFindings } : bundle,
      trace,
    );
  }

  private needsFetch(workflow: ResearchWorkflowKind): boolean {
    return (
      workflow === ResearchWorkflowKind.SEARCH_THEN_FETCH ||
      workflow === ResearchWorkflowKind.SEARCH_FETCH_EXTRACT
    );
  }

  private needsExtract(workflow: ResearchWorkflowKind): boolean {
    return workflow === ResearchWorkflowKind.SEARCH_FETCH_EXTRACT;
  }

  private async runSearch(
    userId: string,
    dto: ExecuteResearchDto,
    trace: ResearchTraceEntry[],
    toolsUsed: string[],
    warnings: string[],
  ): Promise<{
    items: EvidenceItem[];
    providerSelection: EvidenceBundle['providerSelection'];
  }> {
    const start = Date.now();
    // The provider takes a QUERY; the user wrote a prompt. Sending the prompt
    // verbatim used to 400 the whole run past 500 characters, which silently
    // disabled research for anyone who wrote a long message. URLs were already
    // detected from the FULL intent above, so nothing is lost by clamping here.
    const clamped = clampSearchQuery(dto.intent);
    if (clamped.truncated) {
      warnings.push(
        `The search query was shortened to ${String(clamped.query.length)} characters; ` +
          `your full message was still used for everything else.`,
      );
    }
    const searchResult = await this.searchService.execute(userId, {
      providerId: dto.searchProviderId,
      query: clamped.query,
      maxResults: dto.maxResults,
      filters: {
        ...(dto.filters ?? {}),
        researchWorkflow: dto.workflow,
        researchMode: dto.mode,
      },
    });
    warnings.push(...(searchResult.warnings ?? []));
    toolsUsed.push('web_search', `search:${String(searchResult.providerKind).toLowerCase()}`);
    const searchStatus =
      (searchResult.warnings?.length ?? 0) > 0 || searchResult.results.length === 0
        ? 'warning'
        : 'ok';
    const warningSummary =
      (searchResult.warnings?.length ?? 0) > 0
        ? ` warnings=${searchResult.warnings?.join(' | ')}`
        : '';
    trace.push(
      traceEntry(
        'search',
        searchStatus,
        Date.now() - start,
        `${String(searchResult.results.length)} results from ${searchResult.providerName} (${searchResult.selectionMode}${searchResult.fallbackUsed ? ', fallback' : ''})${warningSummary}`,
      ),
    );
    return {
      items: searchResult.results.map((result) => this.searchResultToEvidence(result)),
      providerSelection: {
        providerId: searchResult.providerId,
        providerName: searchResult.providerName,
        providerKind: searchResult.providerKind,
        selectionMode: searchResult.selectionMode,
        fallbackUsed: searchResult.fallbackUsed,
        attemptedProviders: searchResult.attemptedProviders,
      },
    };
  }

  /**
   * Opens the URLs the user wrote, before any search runs.
   *
   * Two rules make this honest rather than merely useful:
   *
   * - **It only runs in a workflow that already fetches.** A `SEARCH_ONLY` run
   *   was priced and chosen as a run that does not open pages; quietly opening
   *   one because a link appeared would change what the user paid for. The run
   *   instead records a warning naming the URL it did not open, so the answer
   *   can say so rather than pretending.
   * - **Every failure becomes a warning, never silence.** A run that fails
   *   cleanly used to produce zero items AND zero warnings, and downstream the
   *   model is only told that browsing happened when one of those is non-empty.
   *   So the moment fetching broke was exactly the moment the model was told
   *   nothing and answered "I can't browse the web" from its training prior.
   *
   * The fetch itself goes through `FetchService`, which owns the SSRF guard,
   * the domain policy and the cache. This adds a caller, not a second path.
   */
  private async runDirectFetch(
    userId: string,
    urls: string[],
    dto: ExecuteResearchDto,
    trace: ResearchTraceEntry[],
    toolsUsed: string[],
    warnings: string[],
  ): Promise<{ items: EvidenceItem[]; rawByUrl: Map<string, string> }> {
    const rawByUrl = new Map<string, string>();
    if (urls.length === 0) {
      return { items: [], rawByUrl };
    }

    if (!this.needsFetch(dto.workflow)) {
      const listed = urls.join(', ');
      warnings.push(
        `The request contained ${String(urls.length)} link(s) (${listed}) that were NOT opened: ` +
          `this run is search-only. Choose a mode that fetches pages to read them.`,
      );
      trace.push(traceEntry('fetch.direct', 'skipped', null, `search-only workflow: ${listed}`));
      return { items: [], rawByUrl };
    }

    const items: EvidenceItem[] = [];
    for (const url of urls) {
      const start = Date.now();
      try {
        const result = await this.fetchService.fetchPage(userId, { url });
        toolsUsed.push('web_fetch', 'web_fetch:user_url');
        const evidence = this.directFetchResultToEvidence(result);
        items.push(evidence);
        if (result.rawHtml !== undefined) {
          rawByUrl.set(evidence.url, result.rawHtml);
        }
        trace.push(
          traceEntry(
            'fetch.direct',
            'ok',
            Date.now() - start,
            `${url} (${String(result.byteSize)} bytes${result.cacheHit ? ', cached' : ''})`,
          ),
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        // Named explicitly, because this is the one the user will ask about:
        // they pasted THIS link and it is THIS page that could not be read.
        warnings.push(`Could not open the link you provided (${url}): ${message}`);
        trace.push(traceEntry('fetch.direct', 'warning', Date.now() - start, `${url}: ${message}`));
      }
    }
    return { items, rawByUrl };
  }

  private async runFetch(
    userId: string,
    searchItems: EvidenceItem[],
    trace: ResearchTraceEntry[],
    toolsUsed: string[],
    warnings: string[],
  ): Promise<{ items: EvidenceItem[]; rawByUrl: Map<string, string> }> {
    const top = searchItems.slice(0, EVIDENCE_FETCH_TOP_N);
    const fetched: EvidenceItem[] = [];
    const rawByUrl = new Map<string, string>();
    for (const item of top) {
      const start = Date.now();
      try {
        const result = await this.fetchService.fetchPage(userId, { url: item.url });
        toolsUsed.push('web_fetch');
        const evidence = this.fetchResultToEvidence(item, result);
        fetched.push(evidence);
        if (result.rawHtml !== undefined) {
          rawByUrl.set(evidence.url, result.rawHtml);
        }
        trace.push(
          traceEntry(
            'fetch',
            'ok',
            Date.now() - start,
            `${item.url} (${String(result.byteSize)} bytes${result.cacheHit ? ', cached' : ''})`,
          ),
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        warnings.push(`Fetch failed for ${item.url}: ${message}`);
        trace.push(traceEntry('fetch', 'warning', Date.now() - start, `${item.url}: ${message}`));
      }
    }
    return { items: fetched, rawByUrl };
  }

  private async runExtract(
    userId: string,
    runId: string,
    fetchItems: EvidenceItem[],
    rawByUrl: Map<string, string>,
    dto: ExecuteResearchDto,
    trace: ResearchTraceEntry[],
    toolsUsed: string[],
    warnings: string[],
  ): Promise<void> {
    const profile = dto.extractionProfile ?? ExtractionProfile.ARTICLE;
    if (fetchItems.length === 0) {
      trace.push(traceEntry('extract', 'skipped', 0, 'No fetched items available'));
      warnings.push('Extract skipped because there were no fetched evidence items.');
      return;
    }

    const profileTool = `scrape:${profile.toLowerCase()}`;
    toolsUsed.push('web_extract', profileTool);
    let extractedCount = 0;
    let skippedCount = 0;
    let attemptedCount = 0;

    for (const item of fetchItems) {
      const start = Date.now();
      const rawHtml = rawByUrl.get(item.url) ?? item.snippet;
      if (rawHtml.length === 0) {
        skippedCount += 1;
        trace.push(traceEntry(profileTool, 'skipped', 0, `${item.url}: empty html/content`));
        continue;
      }
      attemptedCount += 1;
      try {
        const out = this.scrapeService.extract(rawHtml, item.url, profile);
        item.source = 'scrape';
        item.structured = out.structured;
        if (out.title !== null && (item.title === null || item.title.length === 0)) {
          item.title = out.title;
        }
        if (out.text.length > 0) {
          item.snippet = out.text;
        }
        extractedCount += 1;
        warnings.push(...out.warnings.map((warning) => `scrape(${item.url}): ${warning}`));
        trace.push(
          traceEntry(
            profileTool,
            'ok',
            Date.now() - start,
            `${item.url} -> ${String(out.text.length)} chars`,
          ),
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        skippedCount += 1;
        warnings.push(`Scrape failed for ${item.url}: ${message}`);
        trace.push(traceEntry(profileTool, 'warning', Date.now() - start, message));
      } finally {
        await this.researchUsage.record(
          userId,
          'WEB_EXTRACT',
          `${runId}:extract:${String(attemptedCount)}:${sha1Short(item.url)}`,
        );
      }
    }

    const status = extractedCount > 0 ? 'ok' : 'warning';
    trace.push(
      traceEntry(
        'extract',
        status,
        null,
        `extracted=${String(extractedCount)} skipped=${String(skippedCount)} profile=${profile}`,
      ),
    );
  }

  private finalize(
    dto: ExecuteResearchDto,
    providerSelection: EvidenceBundle['providerSelection'],
    items: EvidenceItem[],
    warnings: string[],
    toolsUsed: string[],
  ): EvidenceBundle {
    return buildEvidenceBundle({
      intent: dto.intent,
      workflow: dto.workflow,
      requestedModel: dto.requestedModel ?? null,
      requestedProvider: dto.requestedProvider ?? null,
      providerSelection,
      helperModels: [],
      toolsUsed: [...new Set(toolsUsed)],
      items,
      warnings,
      mode: dto.mode,
    });
  }

  private async completeRun(
    id: string,
    bundle: EvidenceBundle,
    trace: ResearchTraceEntry[],
  ): Promise<ResearchRun> {
    return this.runs.update(id, {
      status: ResearchRunStatus.COMPLETED,
      bundle: bundle as unknown as Prisma.InputJsonValue,
      trace: trace as unknown as Prisma.InputJsonValue,
      completedAt: new Date(),
    });
  }

  private async failRun(
    id: string,
    trace: ResearchTraceEntry[],
    errorMessage: string,
  ): Promise<ResearchRun> {
    return this.runs.update(id, {
      status: ResearchRunStatus.FAILED,
      trace: trace as unknown as Prisma.InputJsonValue,
      errorMessage,
      completedAt: new Date(),
    });
  }

  private searchResultToEvidence(result: SearchResult): EvidenceItem {
    return {
      id: result.id,
      title: result.title,
      url: result.url,
      snippet: result.snippet ?? '',
      source: 'search',
      providerKind: result.providerKind,
      publishedAt: result.publishedAt,
      fetchedAt: null,
      confidence: result.score,
    };
  }

  /**
   * Evidence for a page the user named, which outranks anything discovered.
   *
   * `buildEvidenceBundle` sorts by confidence and then caps the list, so a
   * pasted link scoring like a search hit could be trimmed out of the very
   * bundle it was the point of. It gets the ceiling.
   */
  private directFetchResultToEvidence(result: FetchResult): EvidenceItem {
    return {
      id: sha1Short(`fetch:${result.finalUrl}`),
      title: result.title ?? null,
      url: result.finalUrl,
      snippet: result.content,
      source: 'fetch',
      providerKind: null,
      publishedAt: null,
      fetchedAt: new Date().toISOString(),
      confidence: DIRECT_FETCH_CONFIDENCE,
    };
  }

  private fetchResultToEvidence(searchItem: EvidenceItem, result: FetchResult): EvidenceItem {
    return {
      id: sha1Short(`fetch:${result.finalUrl}`),
      title: result.title ?? searchItem.title,
      url: result.finalUrl,
      snippet: result.content,
      source: 'fetch',
      providerKind: null,
      publishedAt: searchItem.publishedAt,
      fetchedAt: new Date().toISOString(),
      confidence: Math.min(1, searchItem.confidence + 0.05),
    };
  }
}
