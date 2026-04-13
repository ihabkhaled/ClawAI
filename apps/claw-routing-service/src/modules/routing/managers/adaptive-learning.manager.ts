import { Injectable, Logger } from '@nestjs/common';
import { type RoutingDecision } from '../../../generated/prisma';
import { MAX_REASON_TAGS } from '../constants/adaptive-learning.constants';
import { RoutingDecisionsRepository } from '../repositories/routing-decisions.repository';
import type {
  AdaptiveLearningInsights,
  ModeInsight,
  ProviderInsight,
} from '../types/adaptive-learning.types';

@Injectable()
export class AdaptiveLearningManager {
  private readonly logger = new Logger(AdaptiveLearningManager.name);

  constructor(private readonly decisionsRepository: RoutingDecisionsRepository) {}

  async computeInsights(windowDays: number): Promise<AdaptiveLearningInsights> {
    const decisions = await this.decisionsRepository.findInWindow(windowDays);
    this.logger.log(`Computing adaptive insights for ${String(decisions.length)} decisions`);

    const totalDecisions = decisions.length;

    if (totalDecisions === 0) {
      return this.buildEmptyInsights(windowDays);
    }

    const providerInsights = this.computeProviderInsights(decisions);
    const modeInsights = this.computeModeInsights(decisions, totalDecisions);
    const avgConfidence = this.computeAvgConfidence(decisions);
    const topReasonTags = this.computeTopReasonTags(decisions);

    return {
      windowDays,
      totalDecisions,
      providerInsights,
      modeInsights,
      avgConfidence,
      topReasonTags,
    };
  }

  private buildEmptyInsights(windowDays: number): AdaptiveLearningInsights {
    return {
      windowDays,
      totalDecisions: 0,
      providerInsights: [],
      modeInsights: [],
      avgConfidence: 0,
      topReasonTags: [],
    };
  }

  private computeProviderInsights(decisions: RoutingDecision[]): ProviderInsight[] {
    const providerMap = new Map<string, RoutingDecision[]>();

    for (const d of decisions) {
      const existing = providerMap.get(d.selectedProvider) ?? [];
      existing.push(d);
      providerMap.set(d.selectedProvider, existing);
    }

    return [...providerMap.entries()].map(([provider, items]) =>
      this.buildProviderInsight(provider, items),
    );
  }

  private buildProviderInsight(provider: string, items: RoutingDecision[]): ProviderInsight {
    const fallbackCount = items.filter((d) => d.fallbackProvider !== null).length;
    const totalDecisions = items.length;
    const fallbackRate = totalDecisions > 0 ? fallbackCount / totalDecisions : 0;
    const avgConfidence = this.computeAvgConfidence(items);
    const topModes = this.computeTopModes(items);

    return { provider, totalDecisions, fallbackCount, fallbackRate, avgConfidence, topModes };
  }

  private computeModeInsights(decisions: RoutingDecision[], total: number): ModeInsight[] {
    const modeMap = new Map<string, RoutingDecision[]>();

    for (const d of decisions) {
      const mode = String(d.routingMode);
      const existing = modeMap.get(mode) ?? [];
      existing.push(d);
      modeMap.set(mode, existing);
    }

    return [...modeMap.entries()].map(([routingMode, items]) => ({
      routingMode,
      count: items.length,
      percentage: total > 0 ? items.length / total : 0,
      avgConfidence: this.computeAvgConfidence(items),
    }));
  }

  private computeAvgConfidence(decisions: RoutingDecision[]): number {
    if (decisions.length === 0) {
      return 0;
    }
    const sum = decisions.reduce((acc, d) => {
      const conf = d.confidence !== null ? Number(d.confidence) : 0;
      return acc + conf;
    }, 0);
    return sum / decisions.length;
  }

  private computeTopModes(decisions: RoutingDecision[]): string[] {
    const modeCount = new Map<string, number>();
    for (const d of decisions) {
      const mode = String(d.routingMode);
      modeCount.set(mode, (modeCount.get(mode) ?? 0) + 1);
    }
    return [...modeCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([mode]) => mode);
  }

  private computeTopReasonTags(decisions: RoutingDecision[]): string[] {
    const tagCount = new Map<string, number>();
    for (const d of decisions) {
      for (const tag of d.reasonTags) {
        tagCount.set(tag, (tagCount.get(tag) ?? 0) + 1);
      }
    }
    return [...tagCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_REASON_TAGS)
      .map(([tag]) => tag);
  }
}
