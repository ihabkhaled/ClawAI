import { EVIDENCE_FETCH_TOP_N } from '../../../common/constants/evidence.constants';
import {
  RESEARCH_ENGINE_MAX_HITS_KEPT,
  THREAD_MEMORY_EXTRA_CONFIDENCE,
  THREAD_MEMORY_MAX_EXTRAS,
} from '../../../common/constants/research-engine.constants';
import { contentHashOf } from '../../../common/utilities/content-hash.utility';
import { sha1Short } from '../../../common/utilities/hash.utility';
import { canonicalUrlKey } from './fetch-targets.utility';
import { depthBudgetOf, isEngineRequest } from './research-depth.utility';
import { platformFieldsOf } from './evidence-builder.utility';
import { tagItemByHost } from './platform-plan.utility';
import { buildThreadMemory, pickThreadExtras, reusedEvidenceFrom } from './thread-memory.utility';
import type { ResearchPlatform, ResearchSource } from '../../../generated/prisma';
import type { ExecuteResearchDto } from '../dto/execute-research.dto';
import type { EvidenceItem } from '../types/evidence-bundle.types';
import type {
  EngineSearchCounters,
  GoogleRunCounters,
  PlatformRunCounters,
  ResearchRunStats,
  ThreadMemory,
} from '../types/research-engine.types';

/**
 * Per-run state of the research engine (B1+B2), like `FetchPhaseState` for
 * fetch batches. Built for EVERY run; when the request sent no engine field
 * (`engine === false`) every method is the identity of today's pipeline:
 * nothing excluded, top 8 fetched, no thread memory, exact-body dedupe, no
 * annotation, no `stats`.
 */
export class ResearchRunState {
  readonly engine: boolean;
  readonly round: number;
  readonly depth: number | null;
  readonly fetchTopN: number;
  /** Expansion queries allowed: depth budget minus the primary; 0 when depth is absent. */
  readonly expansionCap: number;
  readonly directKeys = new Set<string>();
  duplicatesRemoved = 0;
  pagesRead = 0;
  private readonly excluded: ReadonlySet<string>;
  private readonly languages: string[];
  private memory: ThreadMemory = { readByKey: new Map(), rows: [] };
  private search: EngineSearchCounters = {
    queries: [],
    cachedSearches: 0,
    providersUsed: [],
    resultsFound: 0,
  };
  /** What Google answered in this run (ADR-228); log line only, never on the wire. */
  private google: GoogleRunCounters = { queries: 0, pages: 0, results: 0 };
  /** Research engine B3: set only on a platform run (depth >= 2 + `platforms`). */
  private platformRows: readonly ResearchPlatform[] = [];
  private platformCounters: PlatformRunCounters | null = null;

  constructor(
    dto: ExecuteResearchDto,
    private readonly startedAt: number = Date.now(),
  ) {
    const budget = depthBudgetOf(dto.depth);
    this.engine = isEngineRequest(dto);
    this.round = dto.round ?? 1;
    this.depth = dto.depth ?? null;
    this.fetchTopN = budget?.fetchTopN ?? EVIDENCE_FETCH_TOP_N;
    this.expansionCap = budget === null ? 0 : Math.max(0, budget.queries - 1);
    this.excluded = new Set((dto.excludeUrls ?? []).map((url) => canonicalUrlKey(url)));
    this.languages = dto.languages ?? [];
  }

  /** A URL read earlier in this turn: never fetched again, its search hit dropped. */
  excludes(url: string): boolean {
    return this.excluded.size > 0 && this.excluded.has(canonicalUrlKey(url));
  }

  attachMemory(rows: readonly ResearchSource[], now: Date): void {
    this.memory = buildThreadMemory(rows, now);
  }

  recordSearch(counters: EngineSearchCounters): void {
    this.search = counters;
  }

  recordGoogle(counters: GoogleRunCounters): void {
    this.google = counters;
  }

  /**
   * B3: this is a platform run. `rows` (every enabled platform) tag items by
   * host in `annotate`; the counters become `stats.platforms` and replace
   * `stats.languages` with the languages actually searched.
   */
  recordPlatforms(rows: readonly ResearchPlatform[], counters: PlatformRunCounters): void {
    this.platformRows = rows;
    this.platformCounters = counters;
  }

  /** Pages this run read (pasted + fetched + served from memory), never a thin shell. */
  notePagesRead(pages: readonly EvidenceItem[]): void {
    this.pagesRead = pages.filter(
      (page) => page.source !== 'search' && page.fetch?.thin !== true,
    ).length;
  }

  /** Remembers which pages the user pasted, so the evidence store can label them DIRECT. */
  noteDirect(pages: readonly EvidenceItem[]): void {
    for (const page of pages) {
      this.directKeys.add(canonicalUrlKey(page.url));
    }
  }

  /**
   * Thread memory (a): the page of this fetch target, read successfully in
   * this thread within 24 h, served from the stored excerpt. Null = fetch it.
   */
  reusedPageFor(target: EvidenceItem): EvidenceItem | null {
    const row = this.memory.readByKey.get(canonicalUrlKey(target.url));
    if (row === undefined) {
      return null;
    }
    return {
      ...reusedEvidenceFrom(row, Math.min(1, target.confidence + 0.05), 'fetch'),
      title: row.title ?? target.title,
      ...(target.query === undefined ? {} : { query: target.query }),
      ...platformFieldsOf(target),
    };
  }

  /** Thread memory (b): earlier sources that match the intent and are not in this run yet. */
  threadExtras(intent: string, present: readonly EvidenceItem[]): EvidenceItem[] {
    if (this.memory.rows.length === 0) {
      return [];
    }
    const presentKeys = new Set([
      ...this.excluded,
      ...present.map((item) => canonicalUrlKey(item.url)),
    ]);
    return pickThreadExtras(this.memory, intent, presentKeys, THREAD_MEMORY_MAX_EXTRAS).map((row) =>
      reusedEvidenceFrom(row, THREAD_MEMORY_EXTRA_CONFIDENCE, 'thread'),
    );
  }

  /** The dedupe key of a page body: normalised sha256 (engine, stamped on the item) or exact sha1. */
  bodyKeyOf(item: EvidenceItem): string {
    if (!this.engine) {
      return sha1Short(item.snippet);
    }
    item.contentHash ??= contentHashOf(item.snippet);
    return item.contentHash;
  }

  /** Search hits that go into the bundle: all of them today; the best N in engine mode. */
  keptHits(hits: EvidenceItem[], maxResults: number | undefined): EvidenceItem[] {
    return this.engine
      ? hits.slice(0, Math.max(RESEARCH_ENGINE_MAX_HITS_KEPT, maxResults ?? 0))
      : hits;
  }

  /**
   * A hit whose page is already in the run is dropped, in BOTH modes. The
   * bundle dedupes by URL keeping the higher confidence, and a top hit scores 1
   * while its page is capped at 1, so on the tie the snippet won and the page
   * that was read (and billed) was thrown away. The old path did that until B3.
   */
  withoutReadHits(hits: EvidenceItem[], pages: readonly EvidenceItem[]): EvidenceItem[] {
    if (pages.length === 0) {
      return hits;
    }
    const read = new Set(pages.map((page) => canonicalUrlKey(page.url)));
    return hits.filter((hit) => !read.has(canonicalUrlKey(hit.url)));
  }

  /**
   * Engine items carry `round` and `contentHash`; on a platform run (B3) any
   * item whose host matches a platform domain is tagged too. Today's items are
   * returned untouched.
   */
  annotate(items: EvidenceItem[]): EvidenceItem[] {
    if (!this.engine) {
      return items;
    }
    for (const item of items) {
      item.round = this.round;
      item.contentHash ??= contentHashOf(item.snippet);
      if (this.platformCounters !== null) {
        tagItemByHost(item, this.platformRows);
      }
    }
    return items;
  }

  /** Bundle cap: every engine item is kept (hits are already capped); today's cap otherwise. */
  maxItemsFor(items: readonly EvidenceItem[], maxPages: number | undefined): number | undefined {
    return this.engine ? Math.max(maxPages ?? 0, items.length) : maxPages;
  }

  stats(items: readonly EvidenceItem[]): ResearchRunStats {
    return {
      round: this.round,
      queriesRun: this.search.queries.length,
      queries: this.search.queries,
      languages: this.platformCounters?.languages ?? this.languages,
      providersUsed: this.search.providersUsed,
      resultsFound: this.search.resultsFound,
      pagesRead: this.pagesRead,
      duplicatesRemoved: this.duplicatesRemoved,
      reusedFromThread: items.filter((item) => item.reusedFromRunId !== undefined).length,
      cachedSearches: this.search.cachedSearches,
      ...(this.platformCounters === null ? {} : { platforms: this.platformCounters.platforms }),
    };
  }

  /** Additive bundle fields: `{ stats }` in engine mode, nothing otherwise. */
  bundleFields(items: readonly EvidenceItem[]): { stats?: ResearchRunStats } {
    return this.engine ? { stats: this.stats(items) } : {};
  }

  /** The one `google:` log line of a search run (ADR-228): counts only, never a query or user text. */
  googleLogLine(): string {
    return (
      `google: queries=${String(this.google.queries)} pages=${String(this.google.pages)} ` +
      `results=${String(this.google.results)} depth=${this.depth === null ? 'none' : String(this.depth)} ` +
      `round=${String(this.round)}`
    );
  }

  /** The one `research.run:` log line: counts only, never a URL, query or user text. */
  logLine(items: readonly EvidenceItem[], now: number = Date.now()): string {
    const stats = this.stats(items);
    return (
      `research.run: queries=${String(stats.queriesRun)} cached=${String(stats.cachedSearches)} ` +
      `results=${String(stats.resultsFound)} pages=${String(stats.pagesRead)} ` +
      `dupes=${String(stats.duplicatesRemoved)} reused=${String(stats.reusedFromThread)} ` +
      `round=${String(stats.round)} depth=${this.depth === null ? 'none' : String(this.depth)} ` +
      `platforms=${String(stats.platforms?.length ?? 0)} ms=${String(now - this.startedAt)}`
    );
  }
}
