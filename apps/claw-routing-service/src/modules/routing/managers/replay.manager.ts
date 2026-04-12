import { Injectable, Logger } from '@nestjs/common';
import { RoutingDecisionsRepository } from '../repositories/routing-decisions.repository';
import { RoutingManager } from './routing.manager';
import type {
  ReplayBatchResult,
  ReplayFilters,
  ReplayResult,
} from '../types/replay.types';
import type {
  RoutingContext,
  RoutingDecision,
  RoutingDecisionResult,
} from '../types/routing.types';

@Injectable()
export class ReplayManager {
  private readonly logger = new Logger(ReplayManager.name);

  constructor(
    private readonly decisionsRepository: RoutingDecisionsRepository,
    private readonly routingManager: RoutingManager,
  ) {}

  async replayDecisions(filters: ReplayFilters): Promise<ReplayBatchResult> {
    const decisions = await this.decisionsRepository.findRecent(filters);

    this.logger.log(`Replaying ${String(decisions.length)} historical decisions`);

    const results: ReplayResult[] = [];

    for (const decision of decisions) {
      const result = await this.replaySingleDecision(decision);
      results.push(result);
    }

    return this.buildBatchResult(results);
  }

  private async replaySingleDecision(decision: RoutingDecision): Promise<ReplayResult> {
    const context = this.buildContextFromDecision(decision);
    const newDecision = await this.routingManager.evaluateRoute(context);

    const changed = this.hasDecisionChanged(decision, newDecision);
    const improvementScore = this.calculateImprovementScore(decision, newDecision);

    return {
      messagePreview: (decision.messageContent ?? '').slice(0, 100),
      originalDecision: {
        selectedProvider: decision.selectedProvider,
        selectedModel: decision.selectedModel,
        confidence: decision.confidence ? Number(decision.confidence) : null,
        reasonTags: decision.reasonTags,
        costClass: decision.costClass,
      },
      replayDecision: {
        selectedProvider: newDecision.selectedProvider,
        selectedModel: newDecision.selectedModel,
        confidence: newDecision.confidence,
        reasonTags: newDecision.reasonTags,
        costClass: newDecision.costClass,
        detectedCategory: newDecision.detectedCategory,
        estimatedCostPer1M: newDecision.estimatedCostPer1M,
        latencySlaMs: newDecision.latencySlaMs,
      },
      changed,
      improvementScore,
    };
  }

  private buildContextFromDecision(decision: RoutingDecision): RoutingContext {
    return {
      message: decision.messageContent ?? '',
      threadId: decision.threadId,
      userMode: decision.routingMode,
    };
  }

  private hasDecisionChanged(
    original: RoutingDecision,
    replay: RoutingDecisionResult,
  ): boolean {
    return (
      original.selectedProvider !== replay.selectedProvider ||
      original.selectedModel !== replay.selectedModel
    );
  }

  private calculateImprovementScore(
    original: RoutingDecision,
    replay: RoutingDecisionResult,
  ): number {
    let score = 0;
    const oldConfidence = original.confidence ? Number(original.confidence) : 0;
    const newConfidence = replay.confidence;

    if (newConfidence > oldConfidence) {
      score += 1;
    } else if (newConfidence < oldConfidence) {
      score -= 0.5;
    }

    if (this.isCostLower(original.costClass, replay.costClass)) {
      score += 0.5;
    }

    return Math.max(-1, Math.min(1, score));
  }

  private isCostLower(oldCost: string | null, newCost: string): boolean {
    const costRank: Record<string, number> = {
      free: 0,
      low: 1,
      medium: 2,
      high: 3,
    };
    const oldRank = oldCost ? (costRank[oldCost] ?? 2) : 2;
    const newRank = costRank[newCost] ?? 2;
    return newRank < oldRank;
  }

  private buildBatchResult(results: ReplayResult[]): ReplayBatchResult {
    const changedCount = results.filter((r) => r.changed).length;
    const oldConfidences = results.map((r) => r.originalDecision.confidence ?? 0);
    const newConfidences = results.map((r) => r.replayDecision.confidence);

    return {
      totalReplayed: results.length,
      changed: changedCount,
      unchanged: results.length - changedCount,
      averageConfidenceOld: this.average(oldConfidences),
      averageConfidenceNew: this.average(newConfidences),
      results,
    };
  }

  private average(values: number[]): number {
    if (values.length === 0) {
      return 0;
    }
    const sum = values.reduce((acc, val) => acc + val, 0);
    return sum / values.length;
  }
}
