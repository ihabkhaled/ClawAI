import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AppConfig } from '../../../app/config/app.config';
import {
  HfAutoSyncOutcomeStatus,
  HfAutoSyncTrigger,
  ModelCategory,
  QualityTier,
} from '../../../common/enums';
import {
  HF_AUTO_SYNC_INITIAL_DELAY_MS,
  HF_AUTO_SYNC_MAX_FILE_BYTES,
  HF_TAG_CATEGORY_HINTS,
} from '../constants/hf-discovery.constants';
import { CatalogRepository } from '../repositories/catalog.repository';
import { type HfAutoSyncReport, type HfAutoSyncResult } from '../types/hf-auto-sync.types';
import { type HfModelDetails, type HfModelSummary } from '../types/hf-search.types';
import { HfDiscoveryManager } from './hf-discovery.manager';

@Injectable()
export class HfAutoSyncManager implements OnApplicationBootstrap {
  private readonly logger = new Logger(HfAutoSyncManager.name);
  private running = false;

  constructor(
    private readonly discovery: HfDiscoveryManager,
    private readonly repo: CatalogRepository,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const config = AppConfig.get();
    if (!config.HF_AUTO_SYNC_ENABLED) {
      this.logger.log('onApplicationBootstrap: HF auto-sync disabled (HF_AUTO_SYNC_ENABLED=false)');
      return;
    }
    setTimeout(() => {
      void this.runSafe(HfAutoSyncTrigger.BOOTSTRAP);
    }, HF_AUTO_SYNC_INITIAL_DELAY_MS);
  }

  // Daily at 04:00 UTC by default. Real cron expression read from AppConfig
  // at startup via Schedule's CRON_EXPRESSION constant fallback below.
  @Cron(CronExpression.EVERY_DAY_AT_4AM, { name: 'hf-auto-sync' })
  async scheduledSync(): Promise<void> {
    const config = AppConfig.get();
    if (!config.HF_AUTO_SYNC_ENABLED) return;
    await this.runSafe(HfAutoSyncTrigger.CRON);
  }

  async runOnce(): Promise<HfAutoSyncReport> {
    return this.runSafe(HfAutoSyncTrigger.MANUAL);
  }

  private async runSafe(trigger: HfAutoSyncTrigger): Promise<HfAutoSyncReport> {
    if (this.running) {
      this.logger.warn(`runSafe: skipping ${trigger} — auto-sync already running`);
      return { trigger, imported: 0, skipped: 0, failed: 0, results: [] };
    }
    this.running = true;
    try {
      return await this.runInternal(trigger);
    } catch (error) {
      this.logger.error(`runSafe: ${trigger} failed — ${(error as Error).message}`);
      return { trigger, imported: 0, skipped: 0, failed: 1, results: [] };
    } finally {
      this.running = false;
    }
  }

  private async runInternal(trigger: HfAutoSyncTrigger): Promise<HfAutoSyncReport> {
    const config = AppConfig.get();
    this.logger.log(
      `runInternal: trigger=${trigger} limits trending=${config.HF_AUTO_SYNC_TRENDING_LIMIT} downloads=${config.HF_AUTO_SYNC_DOWNLOADS_LIMIT} likes=${config.HF_AUTO_SYNC_LIKES_LIMIT}`,
    );
    const candidates = await this.collectCandidates();
    let imported = 0;
    let skipped = 0;
    let failed = 0;
    const results: HfAutoSyncResult[] = [];
    for (const summary of candidates) {
      try {
        const outcome = await this.importOne(summary);
        results.push(outcome);
        if (outcome.status === HfAutoSyncOutcomeStatus.IMPORTED) imported += 1;
        else skipped += 1;
      } catch (error) {
        failed += 1;
        const message = (error as Error).message;
        this.logger.warn(`importOne: ${summary.id} failed — ${message}`);
        results.push({ repo: summary.id, status: HfAutoSyncOutcomeStatus.FAILED, reason: message });
      }
    }
    this.logger.log(
      `runInternal: trigger=${trigger} imported=${imported} skipped=${skipped} failed=${failed}`,
    );
    return { trigger, imported, skipped, failed, results };
  }

  private async collectCandidates(): Promise<HfModelSummary[]> {
    const config = AppConfig.get();
    const batches = await Promise.all([
      this.discovery.search({ sort: 'trending', limit: config.HF_AUTO_SYNC_TRENDING_LIMIT }),
      this.discovery.search({ sort: 'downloads', limit: config.HF_AUTO_SYNC_DOWNLOADS_LIMIT }),
      this.discovery.search({ sort: 'likes', limit: config.HF_AUTO_SYNC_LIKES_LIMIT }),
    ]);
    const seen = new Set<string>();
    const merged: HfModelSummary[] = [];
    for (const batch of batches) {
      for (const summary of batch) {
        if (seen.has(summary.id)) continue;
        if (summary.gated || summary.private) continue;
        seen.add(summary.id);
        merged.push(summary);
      }
    }
    return merged;
  }

  private async importOne(summary: HfModelSummary): Promise<HfAutoSyncResult> {
    const details = await this.discovery.getDetails(summary.id);
    if (!details.recommendedFile || !details.recommendedFile.quantization) {
      return {
        repo: summary.id,
        status: HfAutoSyncOutcomeStatus.SKIPPED,
        reason: 'no recommended GGUF quant found',
      };
    }
    if (BigInt(details.recommendedFile.sizeBytes) > HF_AUTO_SYNC_MAX_FILE_BYTES) {
      return {
        repo: summary.id,
        status: HfAutoSyncOutcomeStatus.SKIPPED,
        reason: 'file exceeds 80GB cap',
      };
    }
    const payload = this.discovery.buildOnboardingPayload(details, {
      repo: summary.id,
      quantization: details.recommendedFile.quantization,
      category: this.guessCategory(details),
      qualityTier: this.guessQualityTier(details),
    });
    const exists = await this.repo.findByName(payload.name, payload.tag);
    if (exists) {
      return {
        repo: summary.id,
        status: HfAutoSyncOutcomeStatus.SKIPPED,
        reason: 'already in catalog',
      };
    }
    const sizeGb = Math.max(
      1,
      Math.ceil(Number(details.recommendedFile.sizeBytes) / 1_073_741_824),
    );
    const paramsHint = this.guessParameterCount(details.tags);
    await this.repo.createImported({
      ...payload,
      category: ModelCategory[this.guessCategory(details)],
      qualityTier: QualityTier[this.guessQualityTier(details)],
      parameterCount: paramsHint.label,
      totalParamsB: paramsHint.billions,
      activeParamsB: paramsHint.billions,
      contextLength: 32_768,
      capabilities: [],
      license: 'Unknown',
      requiredRamGb: Math.max(8, sizeGb),
      recommendedRamGb: Math.max(16, sizeGb * 2),
      requiredDiskGb: sizeGb,
      recommendedGpuVramGb: Math.min(24, Math.max(4, Math.ceil(sizeGb / 2))),
    });
    return { repo: summary.id, status: HfAutoSyncOutcomeStatus.IMPORTED };
  }

  private guessCategory(details: HfModelDetails): keyof typeof ModelCategory {
    const tags = details.tags.map((tag) => tag.toLowerCase());
    for (const hint of HF_TAG_CATEGORY_HINTS) {
      if (tags.some((tag) => tag.includes(hint.tag))) {
        return hint.category as keyof typeof ModelCategory;
      }
    }
    return 'GENERAL';
  }

  private guessQualityTier(details: HfModelDetails): keyof typeof QualityTier {
    const billions = this.guessParameterCount(details.tags).billions;
    if (billions >= 70) return 'BEST';
    if (billions >= 8) return 'BALANCED';
    return 'SURVIVAL';
  }

  private guessParameterCount(tags: string[]): { label: string; billions: number } {
    for (const tag of tags) {
      const match = /([0-9]+(?:\.[0-9]+)?)\s*[Bb]/.exec(tag);
      if (match && match[1] !== undefined) {
        const billions = Math.max(1, Math.round(Number(match[1])));
        return { label: `${match[1]}B`, billions };
      }
    }
    return { label: 'Unknown', billions: 7 };
  }
}
