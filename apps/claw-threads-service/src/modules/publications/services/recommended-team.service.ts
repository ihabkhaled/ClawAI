import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import {
  ENTITLEMENTS_ADAPTER,
  type EntitlementsAdapter,
  type UserEntitlements,
} from '@claw/shared-entitlements';

import {
  RECOMMENDED_TEAM_CACHE_MAX_ENTRIES,
  RECOMMENDED_TEAM_CACHE_TTL_MS,
} from '../constants/recommended-team.constants';
import type {
  RecommendedTeamCacheEntry,
  RecommendedTeamResponse,
} from '../types/recommended-team.types';
import { buildRecommendedTeam, classifyCatalog } from '../utilities/recommended-team.utility';
import { ModelCatalogClient } from './model-catalog.client';

/**
 * The server-owned "Recommended team" (P0-2) and the per-model availability the picker shows
 * (P0-3). Plan-aware: it uses the entitlements and the plan test the start preflight uses, over
 * the same picker catalog, so a preselected team is not refused on start. It never calls a model.
 * The answer is cached per owner for 60 s (one replica's memory; a stale answer only affects what
 * is preselected, the preflight still decides on start).
 */
@Injectable()
export class RecommendedTeamService {
  private readonly cache = new Map<string, RecommendedTeamCacheEntry>();

  constructor(
    @Inject(ENTITLEMENTS_ADAPTER) private readonly entitlements: EntitlementsAdapter,
    private readonly catalog: ModelCatalogClient,
  ) {}

  async get(ownerId: string): Promise<RecommendedTeamResponse> {
    const now = Date.now();
    const cached = this.cache.get(ownerId);
    if (cached && cached.expiresAt > now) return cached.value;
    const [entitlements, models] = await Promise.all([
      this.loadEntitlements(ownerId),
      this.catalog.listModels(),
    ]);
    const value: RecommendedTeamResponse = {
      planName: entitlements.plan?.name ?? 'current',
      team: buildRecommendedTeam(entitlements, models),
      models: classifyCatalog(entitlements, models),
    };
    this.remember(ownerId, value, now);
    return value;
  }

  private async loadEntitlements(ownerId: string): Promise<UserEntitlements> {
    try {
      return await this.entitlements.getEntitlements(ownerId, { enforceTrial: false });
    } catch {
      throw new ServiceUnavailableException('Plan lookup is unavailable');
    }
  }

  private remember(ownerId: string, value: RecommendedTeamResponse, now: number): void {
    if (this.cache.size >= RECOMMENDED_TEAM_CACHE_MAX_ENTRIES) {
      for (const [key, entry] of this.cache) {
        if (entry.expiresAt <= now) this.cache.delete(key);
      }
      const oldest = this.cache.keys().next();
      if (this.cache.size >= RECOMMENDED_TEAM_CACHE_MAX_ENTRIES && !oldest.done) {
        this.cache.delete(oldest.value);
      }
    }
    this.cache.set(ownerId, { value, expiresAt: now + RECOMMENDED_TEAM_CACHE_TTL_MS });
  }
}
