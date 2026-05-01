import { Injectable, Logger } from '@nestjs/common';

import { AppConfig } from '../../../app/config/app.config';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { SEARCH_HTTP_TIMEOUT_MS } from '../constants/inbox.constants';
import type { SearchInput, SearchResponse, SearchResultItem } from '../types/inbox.types';

@Injectable()
export class WorkspaceSemanticSearchService {
  private readonly logger = new Logger(WorkspaceSemanticSearchService.name);

  constructor(private readonly prisma: PrismaService) {}

  async search(input: SearchInput): Promise<SearchResponse> {
    this.logger.debug(`search: userId=${input.userId} queryHashLen=${String(input.query.length)}`);
    const memoryUrl = `${AppConfig.get().MEMORY_SERVICE_URL}/api/v1/internal/embeddings/search-workspace-objects`;
    const response = await fetch(memoryUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        userId: input.userId,
        query: input.query,
        topK: input.topK,
        providers: input.providers,
      }),
      signal: AbortSignal.timeout(SEARCH_HTTP_TIMEOUT_MS),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`memory-service search ${String(response.status)}: ${text.slice(0, 200)}`);
    }
    const memoryResponse = (await response.json()) as {
      hits: Array<{
        workspaceObjectId: string;
        provider: string;
        objectType: string;
        contentSnippet: string;
        score: number;
      }>;
      topK: number;
      embeddingModel: string;
    };
    const hydrated = await this.hydrate(memoryResponse.hits);
    return {
      hits: hydrated,
      topK: memoryResponse.topK,
      embeddingModel: memoryResponse.embeddingModel,
    };
  }

  private async hydrate(
    rawHits: Array<{
      workspaceObjectId: string;
      provider: string;
      objectType: string;
      contentSnippet: string;
      score: number;
    }>,
  ): Promise<SearchResultItem[]> {
    if (rawHits.length === 0) return [];
    const ids = rawHits.map((h) => h.workspaceObjectId);
    const rows = await this.prisma.workspaceObject.findMany({
      where: { id: { in: ids } },
      select: { id: true, title: true, url: true, authorId: true },
    });
    const byId = new Map(rows.map((r) => [r.id, r]));
    return rawHits.map((hit) => {
      const row = byId.get(hit.workspaceObjectId);
      return {
        ...hit,
        title: row?.title ?? null,
        url: row?.url ?? null,
        authorId: row?.authorId ?? null,
      };
    });
  }
}
