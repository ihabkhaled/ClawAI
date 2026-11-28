import { Injectable, Logger } from '@nestjs/common';

import { describeFetchFailure } from '../../../common/utilities/describe-fetch-failure.utility';
import {
  EVIDENCE_FETCH_CONCURRENCY,
  EVIDENCE_FETCH_MAX_PER_HOST,
  EVIDENCE_FETCH_PHASE_DEADLINE_MS,
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
import { ResearchEvidenceStoreService } from '../services/research-evidence-store.service';
import {
  buildEvidenceBundle,
  fetchProvenanceOf,
  platformFieldsOf,
  pushFetchToolMarker,
  searchResultToEvidence,
  traceEntry,
} from '../utilities/evidence-builder.utility';
import { hostLaneKey, runFetchBatch } from '../utilities/fetch-batch.utility';
import { canonicalUrlKey, selectFetchTargets } from '../utilities/fetch-targets.utility';
import { FetchPhaseState } from '../utilities/fetch-phase-state.utility';
import { ResearchRunState } from '../utilities/research-run-state.utility';
import { MultiQuerySearchManager } from './multi-query-search.manager';
import { SiteAuditManager } from './site-audit.manager';
import { SiteCrawlManager } from './site-crawl.manager';
import type { ExecuteResearchDto } from '../dto/execute-research.dto';
import type { Prisma, ResearchRun } from '../../../generated/prisma';
import type {
  EvidenceBundle,
  EvidenceItem,
  ResearchTraceEntry,
} from '../types/evidence-bundle.types';
import type { FetchBatchOutcome } from '../types/fetch-batch.types';
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
    private readonly multiQuerySearch: MultiQuerySearchManager,
    private readonly evidenceStore: ResearchEvidenceStoreService,
  ) {}

  async run(userId: string, dto: ExecuteResearchDto): Promise<ResearchRun> {
    const run = await this.runs.create({
      userId,
      requestedModel: dto.requestedModel,
      requestedProvider: dto.requestedProvider,
      workflow: dto.workflow,
      intent: dto.intent,
      status: ResearchRunStatus.RUNNING,
      ...(dto.threadId === undefined ? {} : { threadId: dto.threadId }),
    });

    const trace: ResearchTraceEntry[] = [];
    const warnings: string[] = [];
    const toolsUsed: string[] = [];
    const items: EvidenceItem[] = [];
    // Research engine B1+B2: identity of today's pipeline unless the request
    // sent an engine field (threadId, queries, languages, depth, round, excludeUrls).
    const state = new ResearchRunState(dto);

    try {
      // A URL the user wrote is opened FIRST and on its own terms. It used to
      // reach the search engine as a keyword, so the page a person explicitly
      // named was fetched only if the engine happened to return it. A URL read
      // earlier in this turn (`excludeUrls`) is not opened again.
      const requestedUrls = detectUrlsInText(dto.intent).filter((url) => !state.excludes(url));

      // SITE_CRAWL has no search step at all: it needs the URL to crawl and
      // nothing else, and none of the search/fetch/extract pipeline below
      // applies to it.
      const outcome =
        dto.workflow === ResearchWorkflowKind.SITE_CRAWL
          ? this.runSiteCrawl(userId, requestedUrls, dto, run.id, trace, toolsUsed, warnings, items)
          : this.runSearchFamily(
              userId,
              dto,
              run.id,
              requestedUrls,
              state,
              trace,
              toolsUsed,
              warnings,
            );
      return await outcome;
    } catch (error) {
      const message = describeFetchFailure(error);
      this.logger.warn(`Research run ${run.id} failed: ${message}`);
      trace.push(traceEntry('run.failed', 'error', null, message));
      return this.failRun(run.id, trace, message);
    }
  }

  /**
   * SEARCH_ONLY / SEARCH_THEN_FETCH / SEARCH_FETCH_EXTRACT: search, open pages,
   * extract, then complete the run, log its counters and store its sources.
   */
  private async runSearchFamily(
    userId: string,
    dto: ExecuteResearchDto,
    runId: string,
    requestedUrls: string[],
    state: ResearchRunState,
    trace: ResearchTraceEntry[],
    toolsUsed: string[],
    warnings: string[],
  ): Promise<ResearchRun> {
    const items: EvidenceItem[] = [];
    const phase = new FetchPhaseState();
    // The pasted-URL fetch and the search call are independent, so they run
    // side by side (ADR-211); the hits are fetched the moment search returns,
    // without waiting for the pasted URLs to finish. Thread memory loads
    // alongside them (never rejects; nothing to load without a threadId).
    const memory = this.loadThreadMemory(userId, dto, state);
    const directPromise = this.runDirectFetch(
      userId,
      requestedUrls,
      dto,
      trace,
      toolsUsed,
      warnings,
      phase,
    );
    const search = await this.runSearch(userId, dto, state, trace, toolsUsed, warnings);
    const hits = state.keptHits(search.items, dto.maxResults);
    await memory;
    if (this.needsFetch(dto.workflow)) {
      // Never fetch a page twice in one run: a search hit for a URL the user
      // already pasted is the same page, and the direct fetch has the better
      // provenance.
      const pasted = new Set(requestedUrls.map((url) => canonicalUrlKey(url)));
      const searchTargets = search.items.filter((item) => !pasted.has(canonicalUrlKey(item.url)));
      const [direct, fetch] = await Promise.all([
        directPromise,
        this.runFetch(userId, searchTargets, state, trace, toolsUsed, warnings, phase),
      ]);
      const fresh = this.dropDuplicatePages(direct.items, fetch.items, trace, state);
      const pages = [...direct.items, ...fresh];
      state.noteDirect(direct.items);
      state.notePagesRead(pages);
      items.push(...direct.items, ...state.withoutReadHits(hits, pages), ...fresh);
      if (this.needsExtract(dto.workflow)) {
        await this.runExtract(
          userId,
          runId,
          pages,
          new Map([...direct.rawByUrl, ...fetch.rawByUrl]),
          dto,
          trace,
          toolsUsed,
          warnings,
        );
      }
    } else {
      const direct = await directPromise;
      state.noteDirect(direct.items);
      state.notePagesRead(direct.items);
      items.push(...direct.items, ...hits);
    }
    items.push(...state.threadExtras(dto.intent, items));

    const bundle = this.finalize(
      dto,
      search.providerSelection,
      state.annotate(items),
      warnings,
      toolsUsed,
      state.maxItemsFor(items, dto.maxPages),
    );
    const completed = await this.completeRun(
      runId,
      { ...bundle, ...phase.bundleFields(), ...state.bundleFields(items) },
      trace,
    );
    this.logger.log(state.logLine(items));
    this.persistSources(userId, dto, runId, bundle.items, state.directKeys);
    return completed;
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
    const completed = await this.completeRun(
      runId,
      auditFindings.length > 0 ? { ...bundle, auditFindings } : bundle,
      trace,
    );
    this.persistSources(userId, dto, runId, bundle.items, new Set());
    return completed;
  }

  /** Thread memory (B1): this user's sources for this thread, last 24 h. Never rejects. */
  private async loadThreadMemory(
    userId: string,
    dto: ExecuteResearchDto,
    state: ResearchRunState,
  ): Promise<void> {
    if (dto.threadId === undefined) {
      return;
    }
    const now = new Date();
    state.attachMemory(await this.evidenceStore.loadThreadSources(userId, dto.threadId, now), now);
  }

  /** Evidence store (B1): one row per bundle item, fire-and-forget; never fails the run. */
  private persistSources(
    userId: string,
    dto: ExecuteResearchDto,
    runId: string,
    items: readonly EvidenceItem[],
    directKeys: ReadonlySet<string>,
  ): void {
    this.evidenceStore.persistInBackground({
      runId,
      userId,
      threadId: dto.threadId ?? null,
      round: dto.round ?? 1,
      workflow: dto.workflow,
      items,
      directKeys,
      now: new Date(),
    });
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
    state: ResearchRunState,
    trace: ResearchTraceEntry[],
    toolsUsed: string[],
    warnings: string[],
  ): Promise<{
    items: EvidenceItem[];
    providerSelection: EvidenceBundle['providerSelection'];
  }> {
    if (state.engine) {
      return this.multiQuerySearch.run(userId, dto, state, trace, toolsUsed, warnings);
    }
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
    // Counters for the `research.run:` log line only; no bundle field on this path.
    state.recordSearch({
      queries: [clamped.query],
      cachedSearches: 0,
      providersUsed: searchResult.attemptedProviders,
      resultsFound: searchResult.results.length,
    });
    return {
      items: searchResult.results.map((result) => searchResultToEvidence(result)),
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
      if (result.thinContent === true) {
        warnings.push(
          `The link you provided (${outcome.url}) returned only a page shell even after rendering; its content was not readable and may require sign-in.`,
        );
      }
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
    state: ResearchRunState,
    trace: ResearchTraceEntry[],
    toolsUsed: string[],
    warnings: string[],
    phase: FetchPhaseState,
  ): Promise<{ items: EvidenceItem[]; rawByUrl: Map<string, string> }> {
    const targets = selectFetchTargets(searchItems, state.fetchTopN, EVIDENCE_FETCH_MAX_PER_HOST);
    // Thread memory (a): a target this thread read in the last 24 h is served
    // from the stored excerpt, so it is not fetched (and not billed) again.
    const reused = new Map<EvidenceItem, EvidenceItem>();
    for (const target of targets) {
      const page = state.reusedPageFor(target);
      if (page !== null) {
        reused.set(target, page);
        trace.push(traceEntry('fetch.reused', 'ok', 0, `${target.url}: from thread memory`));
      }
    }
    const live = targets.filter((target) => !reused.has(target));
    const fetchedByTarget = new Map<EvidenceItem, EvidenceItem>();
    const rawByUrl = new Map<string, string>();
    const outcomes = await runFetchBatch(live, {
      urlOf: (item) => item.url,
      worker: (item) => this.fetchService.fetchPage(userId, { url: item.url }),
      concurrency: EVIDENCE_FETCH_CONCURRENCY,
      deadlineMs: EVIDENCE_FETCH_PHASE_DEADLINE_MS,
    });
    phase.record(outcomes, 'search');
    this.logBatch('search', outcomes);
    for (const outcome of outcomes) {
      const item = live[outcome.index];
      const evidence =
        item === undefined
          ? null
          : this.acceptFetched(item, outcome, trace, toolsUsed, warnings, rawByUrl);
      if (item !== undefined && evidence !== null) {
        fetchedByTarget.set(item, evidence);
      }
    }
    // Rank order of the targets, whichever way each page was obtained.
    const items = targets.flatMap((target) => {
      const page = reused.get(target) ?? fetchedByTarget.get(target);
      return page === undefined ? [] : [page];
    });
    return { items, rawByUrl };
  }

  /** One search-hit fetch outcome: the page as evidence, or a warning and null. */
  private acceptFetched(
    item: EvidenceItem,
    outcome: FetchBatchOutcome<FetchResult>,
    trace: ResearchTraceEntry[],
    toolsUsed: string[],
    warnings: string[],
    rawByUrl: Map<string, string>,
  ): EvidenceItem | null {
    item.fetchStatus = outcome.status;
    const took = this.tookMs(outcome);
    if (outcome.status !== 'OK' || outcome.value === undefined) {
      const reason = outcome.error ?? outcome.status;
      warnings.push(`Fetch failed for ${item.url}: ${reason}`);
      trace.push(
        traceEntry('fetch', 'warning', took, `${item.url}: [${outcome.status}] ${reason}`),
      );
      return null;
    }
    const result = outcome.value;
    pushFetchToolMarker(toolsUsed, result);
    const evidence = { ...this.fetchResultToEvidence(item, result), fetchStatus: 'OK' as const };
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
    return evidence;
  }

  /**
   * Same page reached by two routes (a redirect, a mirror, tracking params):
   * keep the first by rank. Direct pages win over search pages. In an engine
   * run the body key is the normalised sha256 (`contentHash`, stamped on every
   * page), so a syndicated copy that differs only in case or spacing is
   * dropped too; each drop is counted in `stats.duplicatesRemoved`.
   */
  private dropDuplicatePages(
    direct: EvidenceItem[],
    fetched: EvidenceItem[],
    trace: ResearchTraceEntry[],
    state: ResearchRunState,
  ): EvidenceItem[] {
    const seenUrl = new Set(direct.map((item) => canonicalUrlKey(item.url)));
    const seenBody = new Set(direct.map((item) => state.bodyKeyOf(item)));
    const kept: EvidenceItem[] = [];
    for (const item of fetched) {
      const urlKey = canonicalUrlKey(item.url);
      const bodyKey = state.bodyKeyOf(item);
      if (seenUrl.has(urlKey) || (item.snippet.length > 0 && seenBody.has(bodyKey))) {
        trace.push(traceEntry('fetch.dedupe', 'skipped', null, `${item.url}: duplicate page`));
        state.duplicatesRemoved += 1;
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
    maxItems: number | undefined = dto.maxPages,
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
      maxItems,
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
      ...(searchItem.query === undefined ? {} : { query: searchItem.query }),
      ...platformFieldsOf(searchItem),
    };
  }
}
