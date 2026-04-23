import { Injectable, Logger } from '@nestjs/common';

import { EVIDENCE_FETCH_TOP_N } from '../../../common/constants/evidence.constants';
import { ResearchRunStatus } from '../../../common/enums/research-run-status.enum';
import { ResearchWorkflowKind } from '../../../common/enums/research-workflow-kind.enum';
import { sha1Short } from '../../../common/utilities/hash.utility';
import { FetchService } from '../../fetch/services/fetch.service';
import { ExtractionProfile } from '../../scrape/enums/extraction-profile.enum';
import { ScrapeService } from '../../scrape/services/scrape.service';
import { SearchExecutionService } from '../../search/services/search-execution.service';
import { ResearchRunRepository } from '../repositories/research-run.repository';
import { buildEvidenceBundle, traceEntry } from '../utilities/evidence-builder.utility';
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
      const search = await this.runSearch(userId, dto, trace, toolsUsed, warnings);
      items.push(...search.items);

      if (this.needsFetch(dto.workflow)) {
        const fetch = await this.runFetch(userId, search.items, trace, toolsUsed, warnings);
        items.push(...fetch.items);
        if (this.needsExtract(dto.workflow)) {
          this.runExtract(fetch.items, fetch.rawByUrl, dto, trace, toolsUsed, warnings);
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
    const searchResult = await this.searchService.execute(userId, {
      providerId: dto.searchProviderId,
      query: dto.intent,
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

  private runExtract(
    fetchItems: EvidenceItem[],
    rawByUrl: Map<string, string>,
    dto: ExecuteResearchDto,
    trace: ResearchTraceEntry[],
    toolsUsed: string[],
    warnings: string[],
  ): void {
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

    for (const item of fetchItems) {
      const start = Date.now();
      const rawHtml = rawByUrl.get(item.url) ?? item.snippet;
      if (rawHtml.length === 0) {
        skippedCount += 1;
        trace.push(traceEntry(profileTool, 'skipped', 0, `${item.url}: empty html/content`));
        continue;
      }
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
