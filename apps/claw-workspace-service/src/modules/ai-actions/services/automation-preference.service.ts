import { Injectable, Logger } from '@nestjs/common';

import { AiActionKind } from '../../../common/enums/ai-action-kind.enum';
import { AutomationPreferenceRepository } from '../repositories/automation-preference.repository';
import type {
  AutomationPreferenceUserView,
  UpsertAutomationPreferenceInput,
} from '../types/automation-preference.types';

@Injectable()
export class AutomationPreferenceService {
  private readonly logger = new Logger(AutomationPreferenceService.name);

  constructor(private readonly repo: AutomationPreferenceRepository) {}

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
