import { Injectable, Logger } from '@nestjs/common';

import { EVIDENCE_FETCH_TOP_N } from '../../../common/constants/evidence.constants';
import { ResearchRunStatus } from '../../../common/enums/research-run-status.enum';
import { ResearchWorkflowKind } from '../../../common/enums/research-workflow-kind.enum';
import { sha1Short } from '../../../common/utilities/hash.utility';
import { FetchService } from '../../fetch/services/fetch.service';
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
      const searchItems = await this.runSearch(userId, dto, trace, toolsUsed);
      items.push(...searchItems);

      if (this.needsFetch(dto.workflow)) {
        const fetchItems = await this.runFetch(userId, searchItems, trace, toolsUsed, warnings);
        items.push(...fetchItems);
      }

      const bundle = this.finalize(dto, items, warnings, toolsUsed);
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

  private async runSearch(
    userId: string,
    dto: ExecuteResearchDto,
    trace: ResearchTraceEntry[],
    toolsUsed: string[],
  ): Promise<EvidenceItem[]> {
    const start = Date.now();
    const searchResult = await this.searchService.execute(userId, {
      providerId: dto.searchProviderId,
      query: dto.intent,
      maxResults: dto.maxResults,
      filters: dto.filters,
    });
    toolsUsed.push('web_search');
    trace.push(
      traceEntry(
        'search',
        'ok',
        Date.now() - start,
        `${String(searchResult.results.length)} results from ${searchResult.providerName}`,
      ),
    );
    return searchResult.results.map((result) => this.searchResultToEvidence(result));
  }

  private async runFetch(
    userId: string,
    searchItems: EvidenceItem[],
    trace: ResearchTraceEntry[],
    toolsUsed: string[],
    warnings: string[],
  ): Promise<EvidenceItem[]> {
    const top = searchItems.slice(0, EVIDENCE_FETCH_TOP_N);
    const fetched: EvidenceItem[] = [];
    for (const item of top) {
      const start = Date.now();
      try {
        const result = await this.fetchService.fetchPage(userId, { url: item.url });
        toolsUsed.push('web_fetch');
        fetched.push(this.fetchResultToEvidence(item, result));
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
    return fetched;
  }

  private finalize(
    dto: ExecuteResearchDto,
    items: EvidenceItem[],
    warnings: string[],
    toolsUsed: string[],
  ): EvidenceBundle {
    return buildEvidenceBundle({
      intent: dto.intent,
      workflow: dto.workflow,
      requestedModel: dto.requestedModel ?? null,
      requestedProvider: dto.requestedProvider ?? null,
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
      // Slightly boost fetched items over raw search items.
      confidence: Math.min(1, searchItem.confidence + 0.05),
    };
  }
}
