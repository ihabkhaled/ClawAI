import { Injectable, Logger } from '@nestjs/common';

import { AppConfig } from '../../../app/config/app.config';
import { LEARNING_HTTP_TIMEOUT_MS } from '../constants/learning.constants';
import type { PreferenceUpsertResult, ProposedPreference } from '../types/learning.types';

@Injectable()
export class PreferenceUpsertService {
  private readonly logger = new Logger(PreferenceUpsertService.name);

  async upsertAll(userId: string, preferences: ProposedPreference[]): Promise<PreferenceUpsertResult> {
    let upserted = 0;
    let skipped = 0;
    for (const pref of preferences) {
      try {
        await this.callMemoryService(userId, pref);
        upserted++;
      } catch (error) {
        skipped++;
        this.logger.warn(
          `upsertAll: skipped pref for user ${userId} actionKind=${pref.actionKind} — ${error instanceof Error ? error.message : 'unknown'}`,
        );
      }
    }
    this.logger.debug(
      `upsertAll: userId=${userId} upserted=${String(upserted)} skipped=${String(skipped)}`,
    );
    return { upsertedCount: upserted, skippedCount: skipped };
  }

  private async callMemoryService(userId: string, pref: ProposedPreference): Promise<void> {
    const baseUrl = AppConfig.get().MEMORY_SERVICE_URL;
    const url = `${baseUrl}/api/v1/internal/memories/automation-preference`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        userId,
        actionKind: pref.actionKind,
        content: pref.content,
        confidence: pref.confidence,
        evidence: pref.evidence,
      }),
      signal: AbortSignal.timeout(LEARNING_HTTP_TIMEOUT_MS),
    });
    if (!response.ok) {
      throw new Error(`memory-service ${String(response.status)}`);
    }
  }
}
