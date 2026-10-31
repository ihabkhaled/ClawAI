import { Injectable, Logger } from '@nestjs/common';

import { describeFetchFailure } from '../../../common/utilities/describe-fetch-failure.utility';
import {
  EVIDENCE_FETCH_CONCURRENCY,
  EVIDENCE_FETCH_MAX_PER_HOST,
  EVIDENCE_FETCH_PHASE_DEADLINE_MS,
  EVIDENCE_FETCH_TOP_N,
} from '../../../common/constants/evidence.constants';
import { CRAWL_SITE_CONCURRENCY } from '../../../common/constants/crawl.constants';
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
import {
  buildEvidenceBundle,
  fetchProvenanceOf,
  pushFetchToolMarker,
  traceEntry,
} from '../utilities/evidence-builder.utility';
import { hostLaneKey, runFetchBatch } from '../utilities/fetch-batch.utility';
import { canonicalUrlKey, selectFetchTargets } from '../utilities/fetch-targets.utility';
import { FetchPhaseState } from '../utilities/fetch-phase-state.utility';
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
    const phase = new FetchPhaseState();

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

      // The pasted-URL fetch and the search call are independent, so they run
      // side by side (ADR-211); the hits are fetched the moment search returns,
      // without waiting for the pasted URLs to finish.
      const directPromise = this.runDirectFetch(
        userId,
        requestedUrls,
        dto,
        trace,
        toolsUsed,
        warnings,
        phase,
      );
      const search = await this.runSearch(userId, dto, trace, toolsUsed, warnings);
      if (this.needsFetch(dto.workflow)) {
        // Never fetch a page twice in one run: a search hit for a URL the user
        // already pasted is the same page, and the direct fetch has the better
        // provenance.
        const pasted = new Set(requestedUrls.map((url) => canonicalUrlKey(url)));
        const searchTargets = search.items.filter((item) => !pasted.has(canonicalUrlKey(item.url)));
        const [direct, fetch] = await Promise.all([
          directPromise,
          this.runFetch(userId, searchTargets, trace, toolsUsed, warnings, phase),
        ]);
        const fresh = this.dropDuplicatePages(direct.items, fetch.items, trace);
        items.push(...direct.items, ...search.items, ...fresh);
        if (this.needsExtract(dto.workflow)) {
          await this.runExtract(
            userId,
            run.id,
            [...direct.items, ...fresh],
            new Map([...direct.rawByUrl, ...fetch.rawByUrl]),
            dto,
            trace,
            toolsUsed,
            warnings,
          );
        }
      } else {
        const direct = await directPromise;
        items.push(...direct.items, ...search.items);
      }

      const bundle = this.finalize(dto, search.providerSelection, items, warnings, toolsUsed);
      return await this.completeRun(run.id, { ...bundle, ...phase.bundleFields() }, trace);
    } catch (error) {
      const message = describeFetchFailure(error);
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
    if (requestedUrls.length === 0) {
      warnings.push('Crawl requested but the message contained no URL to crawl.');
    } else {
      // EVERY url in the message, not just the first. A message that names
      // three pages is asking about three pages; crawling only one and
      // answering confidently from it is worse than saying nothing about the
      // other two.
      //
      // Different sites crawl in parallel (ADR-211): each crawl already fans out
      // across its own pages, and the process-wide worker cap in SiteCrawlManager
      // keeps sites x workers bounded. URLs of the SAME host stay serial, so one
      // host is never hit by two crawls at once. Results merge in URL order.
      const crawls = await runFetchBatch(requestedUrls, {
        urlOf: (url) => url,
        worker: (crawlUrl) =>
          this.siteCrawlManager.crawl(
            userId,
            crawlUrl,
            trace,
            toolsUsed,
            warnings,
            dto.correlationId,
            dto.maxPages,
            dto.intent,
            undefined,
            dto.render,
          ),
        concurrency: CRAWL_SITE_CONCURRENCY,
        deadlineMs: null,
      });
      for (const crawl of crawls) {
        if (crawl.status === 'OK' && crawl.value !== undefined) {
          items.push(...crawl.value);
        } else {
          warnings.push(`Could not crawl ${crawl.url}: ${crawl.error ?? crawl.status}`);
        }
      }
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
    // A planner-written query wins over the raw prompt when one was supplied.
    const clamped = clampSearchQuery(dto.searchQuery ?? dto.intent);
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
    phase: FetchPhaseState,
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
    const outcomes = await runFetchBatch(urls, {
      urlOf: (url) => url,
      worker: (url) => this.fetchService.fetchPage(userId, { url, render: dto.render }),
      concurrency: EVIDENCE_FETCH_CONCURRENCY,
      deadlineMs: EVIDENCE_FETCH_PHASE_DEADLINE_MS,
    });
    phase.record(outcomes, 'user');
    this.logBatch('user', outcomes);
    for (const outcome of outcomes) {
      const took = this.tookMs(outcome);
      if (outcome.status !== 'OK' || outcome.value === undefined) {
        // Named explicitly, because this is the one the user will ask about:
        // they pasted THIS link and it is THIS page that could not be read.
        const reason = outcome.error ?? outcome.status;
        warnings.push(`Could not open the link you provided (${outcome.url}): ${reason}`);
        trace.push(
          traceEntry(
            'fetch.direct',
            'warning',
            took,
            `${outcome.url}: [${outcome.status}] ${reason}`,
          ),
        );
        continue;
      }
      const result = outcome.value;
      pushFetchToolMarker(toolsUsed, result);
      toolsUsed.push('web_fetch:user_url');
      const evidence = { ...this.directFetchResultToEvidence(result), fetchStatus: 'OK' as const };
      items.push(evidence);
      if (result.rawHtml !== undefined) {
        rawByUrl.set(evidence.url, result.rawHtml);
      }
      trace.push(
        traceEntry(
          'fetch.direct',
          'ok',
          took,
          `${outcome.url} (${String(result.byteSize)} bytes${result.cacheHit ? ', cached' : ''})`,
        ),
      );
    }
    return { items, rawByUrl };
  }

  /**
   * Opens the best search hits in parallel (ADR-211): distinct hosts first, a
   * bounded pool across hosts, one host serial, one wall-clock cap for the
   * whole phase. Results are reported in search-rank order, not completion order.
   */
  private async runFetch(
    userId: string,
    searchItems: EvidenceItem[],
    trace: ResearchTraceEntry[],
    toolsUsed: string[],
    warnings: string[],
    phase: FetchPhaseState,
  ): Promise<{ items: EvidenceItem[]; rawByUrl: Map<string, string> }> {
    const targets = selectFetchTargets(
      searchItems,
      EVIDENCE_FETCH_TOP_N,
      EVIDENCE_FETCH_MAX_PER_HOST,
    );
    const fetched: EvidenceItem[] = [];
    const rawByUrl = new Map<string, string>();
    const outcomes = await runFetchBatch(targets, {
      urlOf: (item) => item.url,
      worker: (item) => this.fetchService.fetchPage(userId, { url: item.url }),
      concurrency: EVIDENCE_FETCH_CONCURRENCY,
      deadlineMs: EVIDENCE_FETCH_PHASE_DEADLINE_MS,
    });
    phase.record(outcomes, 'search');
    this.logBatch('search', outcomes);
    for (const outcome of outcomes) {
      const item = targets[outcome.index];
      if (item === undefined) {
        continue;
      }
      item.fetchStatus = outcome.status;
      const took = this.tookMs(outcome);
      if (outcome.status !== 'OK' || outcome.value === undefined) {
        const reason = outcome.error ?? outcome.status;
        warnings.push(`Fetch failed for ${item.url}: ${reason}`);
        trace.push(
          traceEntry('fetch', 'warning', took, `${item.url}: [${outcome.status}] ${reason}`),
        );
        continue;
      }
      const result = outcome.value;
      pushFetchToolMarker(toolsUsed, result);
      const evidence = { ...this.fetchResultToEvidence(item, result), fetchStatus: 'OK' as const };
      fetched.push(evidence);
      if (result.rawHtml !== undefined) {
        rawByUrl.set(evidence.url, result.rawHtml);
      }
      trace.push(
        traceEntry(
          'fetch',
          'ok',
          took,
          `${item.url} (${String(result.byteSize)} bytes${result.cacheHit ? ', cached' : ''})`,
        ),
      );
    }
    return { items: fetched, rawByUrl };
  }

  /**
   * Same page reached by two routes (a redirect, a mirror, tracking params):
   * keep the first by rank. Direct pages win over search pages.
   */
  private dropDuplicatePages(
    direct: EvidenceItem[],
    fetched: EvidenceItem[],
    trace: ResearchTraceEntry[],
  ): EvidenceItem[] {
    const seenUrl = new Set(direct.map((item) => canonicalUrlKey(item.url)));
    const seenBody = new Set(direct.map((item) => sha1Short(item.snippet)));
    const kept: EvidenceItem[] = [];
    for (const item of fetched) {
      const urlKey = canonicalUrlKey(item.url);
      const bodyKey = sha1Short(item.snippet);
      if (seenUrl.has(urlKey) || (item.snippet.length > 0 && seenBody.has(bodyKey))) {
        trace.push(traceEntry('fetch.dedupe', 'skipped', null, `${item.url}: duplicate page`));
        continue;
      }
      seenUrl.add(urlKey);
      seenBody.add(bodyKey);
      kept.push(item);
    }
    return kept;
  }

  private tookMs(outcome: { startedAt: number | null; endedAt: number | null }): number | null {
    return outcome.startedAt !== null && outcome.endedAt !== null
      ? outcome.endedAt - outcome.startedAt
      : null;
  }

  /** Per-page start/end offsets so overlap is visible in the logs; hosts only, never a full URL. */
  private logBatch(
    origin: string,
    outcomes: ReadonlyArray<{
      url: string;
      status: string;
      startedAt: number | null;
      endedAt: number | null;
    }>,
  ): void {
    const starts = outcomes.flatMap((o) => (o.startedAt === null ? [] : [o.startedAt]));
    const t0 = starts.length > 0 ? Math.min(...starts) : 0;
    const rows = outcomes.map((o) => {
      const start = o.startedAt === null ? '-' : String(o.startedAt - t0);
      const end = o.endedAt === null ? '-' : String(o.endedAt - t0);
      return `${hostLaneKey(o.url)}[${o.status} ${start}..${end}ms]`;
    });
    this.logger.log(`research.fetch.batch origin=${origin} pages=${rows.join(' ')}`);
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
        const message = describeFetchFailure(error);
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
      maxItems: dto.maxPages,
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
      ...fetchProvenanceOf(result),
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
      ...fetchProvenanceOf(result),
    };
  }
}
