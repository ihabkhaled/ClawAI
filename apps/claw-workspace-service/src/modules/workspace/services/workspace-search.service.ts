import { Injectable } from '@nestjs/common';

import { WorkspaceSearchManager } from '../managers/workspace-search.manager';
import type { WorkspaceSearchQueryDto } from '../dto/workspace-search-query.dto';
import type { WorkspaceInternalSearchQueryDto } from '../dto/workspace-internal-search-query.dto';
import type { WorkspaceSearchFilters, WorkspaceSearchResponse } from '../types/workspace.types';

@Injectable()
export class WorkspaceSearchService {
  constructor(private readonly searchManager: WorkspaceSearchManager) {}

  async search(userId: string, dto: WorkspaceSearchQueryDto): Promise<WorkspaceSearchResponse> {
    const filters: WorkspaceSearchFilters = {
      types: dto.types,
      providers: dto.providers,
    };
    return this.searchManager.search(userId, dto.query, dto.limit, filters);
  }

  async searchInternal(dto: WorkspaceInternalSearchQueryDto): Promise<WorkspaceSearchResponse> {
    return this.searchManager.search(dto.userId, dto.query, dto.limit);
  }
}
