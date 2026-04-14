import { Injectable, Logger } from '@nestjs/common';

import { SEARCH_SNIPPET_LENGTH } from '../../../common/constants/workspace.constants';
import { WorkspaceObjectRepository } from '../repositories/workspace-object.repository';
import type {
  WorkspaceSearchFilters,
  WorkspaceSearchResponse,
  WorkspaceSearchResult,
} from '../types/workspace.types';
import type { WorkspaceObject } from '../../../generated/prisma';

@Injectable()
export class WorkspaceSearchManager {
  private readonly logger = new Logger(WorkspaceSearchManager.name);

  constructor(private readonly objectRepository: WorkspaceObjectRepository) {}

  async search(
    userId: string,
    query: string,
    limit: number,
    filters?: WorkspaceSearchFilters,
  ): Promise<WorkspaceSearchResponse> {
    const start = Date.now();
    const objects = await this.objectRepository.search(userId, query, limit, filters);
    const results: WorkspaceSearchResult[] = objects.map((obj) => this.toSearchResult(obj, query));
    results.sort((a, b) => b.score - a.score);
    this.logger.log(
      `Search for "${query.slice(0, 50)}" returned ${results.length} results in ${Date.now() - start}ms`,
    );
    return { results, total: results.length, query };
  }

  private toSearchResult(obj: WorkspaceObject, query: string): WorkspaceSearchResult {
    const lowerQuery = query.toLowerCase();
    const titleLower = obj.title.toLowerCase();
    const score = this.computeScore(titleLower, obj.content, lowerQuery);
    const snippet = this.buildSnippet(obj.content, query);
    return {
      id: obj.id,
      title: obj.title,
      type: obj.type,
      provider: obj.provider,
      url: obj.url,
      snippet,
      score,
      externalId: obj.externalId,
      connectorId: obj.connectorId,
      externalCreatedAt: obj.externalCreatedAt,
    };
  }

  private computeScore(titleLower: string, content: string | null, lowerQuery: string): number {
    if (titleLower === lowerQuery) {
      return 1.0;
    }
    if (titleLower.includes(lowerQuery)) {
      return 0.8;
    }
    if (content?.toLowerCase().includes(lowerQuery) === true) {
      return 0.5;
    }
    return 0.3;
  }

  private buildSnippet(content: string | null, query: string): string | null {
    if (content === null) {
      return null;
    }
    const lower = content.toLowerCase();
    const idx = lower.indexOf(query.toLowerCase());
    if (idx === -1) {
      return content.slice(0, SEARCH_SNIPPET_LENGTH);
    }
    const start = Math.max(0, idx - 60);
    return content.slice(start, start + SEARCH_SNIPPET_LENGTH);
  }
}
