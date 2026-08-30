import { Injectable, Logger } from '@nestjs/common';

import { AppConfig } from '../../../app/config/app.config';
import { AiActionKind } from '../../../common/enums/ai-action-kind.enum';
import { LEARNED_PREFERENCES_FETCH_TIMEOUT_MS } from '../constants/ai-action-prompts.constants';
import { AutomationPreferenceRepository } from '../repositories/automation-preference.repository';
import type {
  AutomationPreferenceUserView,
  LearnedPreferenceItem,
  UpsertAutomationPreferenceInput,
} from '../types/automation-preference.types';
import { buildAuthHeader } from '../../../common/utilities/file-service-client.utility';

@Injectable()
export class AutomationPreferenceService {
  private readonly logger = new Logger(AutomationPreferenceService.name);

  constructor(private readonly repo: AutomationPreferenceRepository) {}

  /**
   * Stream 40.3 — proxies memory-service's `/internal/memories/
   * learned-preferences` so the frontend can browse "what we've learned"
   * PREFERENCEs without needing the service token. Phase 11 also calls
   * this from AiActionExecutionManager to inject the same preferences into
   * the generation prompt — best-effort on both call sites: a memory-
   * service hiccup returns an empty list rather than failing the caller.
   */
  async fetchLearned(
    userId: string,
    actionKind?: string,
    limit?: number,
  ): Promise<LearnedPreferenceItem[]> {
    const params = new URLSearchParams();
    params.set('userId', userId);
    if (actionKind !== undefined && actionKind.length > 0) {
      params.set('actionKind', actionKind);
    }
    if (limit !== undefined) {
      params.set('limit', String(limit));
    }
    const url = `${AppConfig.get().MEMORY_SERVICE_URL}/api/v1/internal/memories/learned-preferences?${params.toString()}`;
    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/json', Authorization: buildAuthHeader() },
        signal: AbortSignal.timeout(LEARNED_PREFERENCES_FETCH_TIMEOUT_MS),
      });
      if (!response.ok) {
        return [];
      }
      return (await response.json()) as LearnedPreferenceItem[];
    } catch (error: unknown) {
      this.logger.warn(
        `fetchLearned: request failed for userId=${userId} — ${error instanceof Error ? error.message : 'unknown'}`,
      );
      return [];
    }
  }

  async listForUser(userId: string): Promise<AutomationPreferenceUserView[]> {
    this.logger.debug(`listForUser: userId=${userId}`);
    const stored = await this.repo.listByUser(userId);
    const map = new Map(stored.map((row) => [row.actionKind, row]));
    const allKinds = Object.values(AiActionKind);
    return allKinds.map((kind) => {
      const row = map.get(kind);
      if (row === undefined) {
        return {
          actionKind: kind,
          isEnabled: true,
          autoApproveBelowRiskScore: null,
          perDayBudget: null,
          providers: [],
        };
      }
      return {
        actionKind: row.actionKind,
        isEnabled: row.isEnabled,
        autoApproveBelowRiskScore: row.autoApproveBelowRiskScore,
        perDayBudget: row.perDayBudget,
        providers: this.normalizeProviders(row.providers),
      };
    });
  }

  async upsert(input: UpsertAutomationPreferenceInput): Promise<AutomationPreferenceUserView> {
    this.logger.log(`upsert: userId=${input.userId} actionKind=${input.actionKind}`);
    const updateData: Record<string, unknown> = {};
    if (typeof input.isEnabled === 'boolean') {
      updateData['isEnabled'] = input.isEnabled;
    }
    if (input.autoApproveBelowRiskScore !== undefined) {
      updateData['autoApproveBelowRiskScore'] = input.autoApproveBelowRiskScore;
    }
    if (input.perDayBudget !== undefined) {
      updateData['perDayBudget'] = input.perDayBudget;
    }
    if (input.providers !== undefined) {
      updateData['providers'] = input.providers;
    }
    const row = await this.repo.upsert(input.userId, input.actionKind, updateData);
    return {
      actionKind: row.actionKind,
      isEnabled: row.isEnabled,
      autoApproveBelowRiskScore: row.autoApproveBelowRiskScore,
      perDayBudget: row.perDayBudget,
      providers: this.normalizeProviders(row.providers),
    };
  }

  private normalizeProviders(raw: unknown): string[] {
    if (Array.isArray(raw)) {
      return raw.filter((v): v is string => typeof v === 'string');
    }
    return [];
  }
}
