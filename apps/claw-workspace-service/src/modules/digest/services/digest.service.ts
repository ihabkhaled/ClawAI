import { Injectable, Logger } from '@nestjs/common';

import { DigestRepository } from '../repositories/digest.repository';
import type {
  DigestPreferenceView,
  DigestSection,
  DigestSnapshotPayload,
  UpsertDigestPreferenceInput,
} from '../types/digest.types';
import type { DigestScope } from '../../../generated/prisma';

@Injectable()
export class DigestService {
  private readonly logger = new Logger(DigestService.name);

  constructor(private readonly repo: DigestRepository) {}

  async listForUser(userId: string, scope: DigestScope, limit: number): Promise<DigestSnapshotPayload[]> {
    this.logger.debug(`listForUser: userId=${userId} scope=${scope} limit=${String(limit)}`);
    const rows = await this.repo.listForUser(userId, scope, limit);
    return rows.map((row) => this.toPayload(row));
  }

  async getToday(userId: string, scope: DigestScope, date: Date): Promise<DigestSnapshotPayload | null> {
    const row = await this.repo.findToday(userId, scope, date);
    return row === null ? null : this.toPayload(row);
  }

  async getPreference(userId: string): Promise<DigestPreferenceView> {
    const stored = await this.repo.findPreferenceByUserId(userId);
    if (stored === null) {
      return {
        dailyEnabled: true,
        weeklyEnabled: true,
        dailyHourLocal: 8,
        weeklyDayOfWeek: 5,
        weeklyHourLocal: 8,
        timezone: 'UTC',
        providers: [],
        lastDailyAt: null,
        lastWeeklyAt: null,
      };
    }
    return {
      dailyEnabled: stored.dailyEnabled,
      weeklyEnabled: stored.weeklyEnabled,
      dailyHourLocal: stored.dailyHourLocal,
      weeklyDayOfWeek: stored.weeklyDayOfWeek,
      weeklyHourLocal: stored.weeklyHourLocal,
      timezone: stored.timezone,
      providers: this.normalizeStringArray(stored.providers),
      lastDailyAt: stored.lastDailyAt?.toISOString() ?? null,
      lastWeeklyAt: stored.lastWeeklyAt?.toISOString() ?? null,
    };
  }

  async upsertPreference(input: UpsertDigestPreferenceInput): Promise<DigestPreferenceView> {
    this.logger.log(`upsertPreference: userId=${input.userId}`);
    const updateData: Record<string, unknown> = {};
    if (input.dailyEnabled !== undefined) updateData['dailyEnabled'] = input.dailyEnabled;
    if (input.weeklyEnabled !== undefined) updateData['weeklyEnabled'] = input.weeklyEnabled;
    if (input.dailyHourLocal !== undefined) updateData['dailyHourLocal'] = input.dailyHourLocal;
    if (input.weeklyDayOfWeek !== undefined) updateData['weeklyDayOfWeek'] = input.weeklyDayOfWeek;
    if (input.weeklyHourLocal !== undefined) updateData['weeklyHourLocal'] = input.weeklyHourLocal;
    if (input.timezone !== undefined) updateData['timezone'] = input.timezone;
    if (input.providers !== undefined) updateData['providers'] = input.providers;
    await this.repo.upsertPreference(input.userId, updateData);
    return this.getPreference(input.userId);
  }

  private toPayload(row: {
    id: string;
    userId: string;
    scope: DigestScope;
    snapshotDate: Date;
    sections: unknown;
    actionItemSuggestionIds: unknown;
    generatedAt: Date;
    modelUsed: string;
    durationMs: number;
    errorMessage: string | null;
  }): DigestSnapshotPayload {
    return {
      id: row.id,
      userId: row.userId,
      scope: row.scope,
      snapshotDate: row.snapshotDate.toISOString().slice(0, 10),
      sections: this.normalizeSections(row.sections),
      actionItemSuggestionIds: this.normalizeStringArray(row.actionItemSuggestionIds),
      generatedAt: row.generatedAt.toISOString(),
      modelUsed: row.modelUsed,
      durationMs: row.durationMs,
      errorMessage: row.errorMessage,
    };
  }

  private normalizeStringArray(raw: unknown): string[] {
    if (Array.isArray(raw)) {
      return raw.filter((v): v is string => typeof v === 'string');
    }
    return [];
  }

  private normalizeSections(raw: unknown): DigestSection[] {
    if (!Array.isArray(raw)) return [];
    return raw.filter((v): v is DigestSection => typeof v === 'object' && v !== null && 'provider' in v);
  }
}
