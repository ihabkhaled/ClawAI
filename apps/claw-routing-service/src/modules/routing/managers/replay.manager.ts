import { Injectable, Logger } from '@nestjs/common';
import { type OutcomeLabel } from '../../../generated/prisma';
import { ReplayOutcomeLabel } from '../../../common/enums/replay-outcome-label.enum';
import {
  CONFIDENCE_IMPROVEMENT_THRESHOLD,
  CONFIDENCE_QUALITY_WIN_THRESHOLD,
  CONFIDENCE_REGRESSION_THRESHOLD,
  COST_RANK,
  SUSPICIOUS_CONFIDENCE_DROP,
  SUSPICIOUS_COST_RANK_JUMP,
} from '../constants/replay.constants';
import { RoutingDecisionsRepository } from '../repositories/routing-decisions.repository';
import { ReplayRunsRepository } from '../repositories/replay-runs.repository';
import { ReplayCasesRepository } from '../repositories/replay-cases.repository';
import { RoutingManager } from './routing.manager';
import type {
  LabelBreakdown,
  ReplayBatchResult,
  ReplayFilters,
  ReplayResult,
} from '../types/replay.types';
import type { ExportBundle, ReplayCaseDetail, ReplayRunSummary } from '../types/replay-run.types';
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
    private readonly runsRepository: ReplayRunsRepository,
    private readonly casesRepository: ReplayCasesRepository,
    private readonly routingManager: RoutingManager,
  ) {}

  async replayDecisions(filters: ReplayFilters): Promise<ReplayBatchResult> {
    const decisions = await this.decisionsRepository.findRecent(filters);
    this.logger.log(`Replaying ${String(decisions.length)} historical decisions in parallel`);

    const settled = await Promise.allSettled(decisions.map((d) => this.replaySingleDecision(d)));

    const results: ReplayResult[] = [];
    for (const [index, result] of settled.entries()) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        const msg = result.reason instanceof Error ? result.reason.message : 'Unknown error';
        this.logger.warn(`replaySingleDecision[${String(index)}] failed: ${msg}`);
      }
    }

    const batchResult = this.buildBatchResult(results);

    if (filters.saveRun === true) {
      const run = await this.runsRepository.create({
        name: filters.runName,
        filters: {
          threadId: filters.threadId ?? null,
          routingMode: filters.routingMode ?? null,
          startDate: filters.startDate ?? null,
          endDate: filters.endDate ?? null,
          limit: filters.limit ?? null,
        },
        totalReplayed: batchResult.totalReplayed,
        changedCount: batchResult.changed,
        suspiciousCount: batchResult.suspiciousCount,
        avgConfOld: batchResult.averageConfidenceOld,
        avgConfNew: batchResult.averageConfidenceNew,
        avgImprovement: batchResult.averageImprovementScore,
        labelBreakdown: batchResult.labelBreakdown,
      });

      await this.casesRepository.createMany(
        results.map((r) => ({
          runId: run.id,
          messagePreview: r.messagePreview,
          hasOriginalContent: r.hasOriginalContent,
          oldProvider: r.originalDecision.selectedProvider,
          oldModel: r.originalDecision.selectedModel,
          oldConfidence: r.originalDecision.confidence ?? undefined,
          oldCostClass: r.originalDecision.costClass ?? undefined,
          newProvider: r.replayDecision.selectedProvider,
          newModel: r.replayDecision.selectedModel,
          newConfidence: r.replayDecision.confidence,
          newCostClass: r.replayDecision.costClass,
          changed: r.changed,
          improvementScore: r.improvementScore,
          outcomeLabel: r.outcomeLabel as unknown as OutcomeLabel,
          isSuspicious: r.isSuspicious,
          suspiciousReasons: r.suspiciousReasons,
        })),
      );

      batchResult.runId = run.id;
    }

    return batchResult;
  }

  async getRunSummaries(page: number, limit: number): Promise<ReplayRunSummary[]> {
    const runs = await this.runsRepository.findAll(page, limit);
    return runs.map((r) => ({
      id: r.id,
      name: r.name,
      totalReplayed: r.totalReplayed,
      changedCount: r.changedCount,
      suspiciousCount: r.suspiciousCount,
      avgConfOld: Number(r.avgConfOld),
      avgConfNew: Number(r.avgConfNew),
      avgImprovement: Number(r.avgImprovement),
      labelBreakdown: r.labelBreakdown as LabelBreakdown,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async countRuns(): Promise<number> {
    return this.runsRepository.countAll();
  }

  async getRunCases(runId: string): Promise<ReplayCaseDetail[]> {
    const cases = await this.casesRepository.findByRunId(runId);
    return cases.map((c) => this.mapCaseToDetail(c));
  }

  async getSuspiciousCases(runId: string): Promise<ReplayCaseDetail[]> {
    const cases = await this.casesRepository.findSuspiciousByRunId(runId);
    return cases.map((c) => this.mapCaseToDetail(c));
  }

  async reviewCase(
    caseId: string,
    isConfirmedRegression: boolean,
    reviewNotes: string | undefined,
  ): Promise<ReplayCaseDetail> {
    const updated = await this.casesRepository.review(caseId, isConfirmedRegression, reviewNotes);
    return this.mapCaseToDetail(updated);
  }

  async buildExportBundle(runId: string): Promise<ExportBundle> {
    const run = await this.runsRepository.findById(runId);
    const cases = await this.casesRepository.findSuspiciousByRunId(runId);

    return {
      runId,
      runName: run?.name ?? null,
      exportedAt: new Date().toISOString(),
      totalCases: cases.length,
      cases: cases.map((c) => ({
        id: c.id,
        messagePreview: c.messagePreview,
        originalPrompt: c.messageContent,
        originalDecision: {
          provider: c.oldProvider,
          model: c.oldModel,
          confidence: c.oldConfidence ? Number(c.oldConfidence) : null,
          costClass: c.oldCostClass,
        },
        replayDecision: {
          provider: c.newProvider,
          model: c.newModel,
          confidence: Number(c.newConfidence),
          costClass: c.newCostClass,
        },
        outcomeLabel: c.outcomeLabel,
        suspiciousReasons: c.suspiciousReasons,
        improvementScore: Number(c.improvementScore),
      })),
    };
  }

  private async replaySingleDecision(decision: RoutingDecision): Promise<ReplayResult> {
    const hasOriginalContent = Boolean(decision.messageContent?.trim());
    const context = this.buildContextFromDecision(decision);
    const newDecision = await this.routingManager.evaluateRoute(context);

    const changed = this.hasDecisionChanged(decision, newDecision);
    const improvementScore = this.calculateImprovementScore(decision, newDecision);
    const outcomeLabel = this.assignOutcomeLabel(decision, newDecision);
    const suspiciousReasons = this.detectSuspiciousReasons(
      decision,
      newDecision,
      hasOriginalContent,
      changed,
      improvementScore,
    );

    return {
      messagePreview: (decision.messageContent ?? '').slice(0, 120),
      hasOriginalContent,
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
      outcomeLabel,
      isSuspicious: suspiciousReasons.length > 0,
      suspiciousReasons,
    };
  }

  private buildContextFromDecision(decision: RoutingDecision): RoutingContext {
    return {
      message: decision.messageContent ?? '',
      threadId: decision.threadId,
      userMode: decision.routingMode,
    };
  }

  private hasDecisionChanged(original: RoutingDecision, replay: RoutingDecisionResult): boolean {
    return (
      original.selectedProvider !== replay.selectedProvider ||
      original.selectedModel !== replay.selectedModel
    );
  }

  private assignOutcomeLabel(
    original: RoutingDecision,
    replay: RoutingDecisionResult,
  ): ReplayOutcomeLabel {
    const oldConf = original.confidence ? Number(original.confidence) : 0;
    const confDiff = replay.confidence - oldConf;
    const costWorsened = this.isCostHigher(original.costClass, replay.costClass);
    const costImproved = this.isCostLower(original.costClass, replay.costClass);

    if (confDiff >= CONFIDENCE_QUALITY_WIN_THRESHOLD) {
      return ReplayOutcomeLabel.QUALITY_WIN;
    }
    if (
      confDiff <= CONFIDENCE_REGRESSION_THRESHOLD ||
      (costWorsened && confDiff < CONFIDENCE_IMPROVEMENT_THRESHOLD)
    ) {
      return ReplayOutcomeLabel.BAD_REGRESSION;
    }
    if (costImproved && confDiff >= -CONFIDENCE_IMPROVEMENT_THRESHOLD) {
      return ReplayOutcomeLabel.COST_WIN;
    }
    if (confDiff >= CONFIDENCE_IMPROVEMENT_THRESHOLD && !costWorsened) {
      return ReplayOutcomeLabel.CORRECT_IMPROVEMENT;
    }
    return ReplayOutcomeLabel.UNCERTAIN;
  }

  private detectSuspiciousReasons(
    original: RoutingDecision,
    replay: RoutingDecisionResult,
    hasOriginalContent: boolean,
    changed: boolean,
    improvementScore: number,
  ): string[] {
    const reasons: string[] = [];
    const oldConf = original.confidence ? Number(original.confidence) : 0;

    if (!hasOriginalContent) {
      reasons.push('empty_message_content');
    }
    if (replay.confidence - oldConf <= SUSPICIOUS_CONFIDENCE_DROP) {
      reasons.push('large_confidence_drop');
    }
    const oldRank = this.getCostRank(original.costClass ?? '');
    const newRank = this.getCostRank(replay.costClass);
    if (newRank - oldRank >= SUSPICIOUS_COST_RANK_JUMP) {
      reasons.push('large_cost_increase');
    }
    if (changed && improvementScore < 0) {
      reasons.push('route_changed_with_negative_improvement');
    }

    return reasons;
  }

  private calculateImprovementScore(
    original: RoutingDecision,
    replay: RoutingDecisionResult,
  ): number {
    let score = 0;
    const oldConf = original.confidence ? Number(original.confidence) : 0;

    if (replay.confidence > oldConf) {
      score += 1;
    } else if (replay.confidence < oldConf) {
      score -= 0.5;
    }
    if (this.isCostLower(original.costClass, replay.costClass)) {
      score += 0.5;
    }

    return Math.max(-1, Math.min(1, score));
  }

  private isCostLower(oldCost: string | null, newCost: string): boolean {
    return this.getCostRank(newCost) < this.getCostRank(oldCost ?? '');
  }

  private isCostHigher(oldCost: string | null, newCost: string): boolean {
    return this.getCostRank(newCost) > this.getCostRank(oldCost ?? '');
  }

  private getCostRank(cost: string): number {
    return COST_RANK[cost] ?? 2;
  }

  private buildBatchResult(results: ReplayResult[]): ReplayBatchResult {
    const changedCount = results.filter((r) => r.changed).length;
    const suspiciousCount = results.filter((r) => r.isSuspicious).length;
    const oldConfidences = results.map((r) => r.originalDecision.confidence ?? 0);
    const newConfidences = results.map((r) => r.replayDecision.confidence);
    const improvementScores = results.map((r) => r.improvementScore);

    return {
      totalReplayed: results.length,
      changed: changedCount,
      unchanged: results.length - changedCount,
      averageConfidenceOld: this.average(oldConfidences),
      averageConfidenceNew: this.average(newConfidences),
      averageImprovementScore: this.average(improvementScores),
      suspiciousCount,
      labelBreakdown: this.buildLabelBreakdown(results),
      results,
    };
  }

  private buildLabelBreakdown(results: ReplayResult[]): LabelBreakdown {
    return {
      correctImprovement: results.filter(
        (r) => r.outcomeLabel === ReplayOutcomeLabel.CORRECT_IMPROVEMENT,
      ).length,
      badRegression: results.filter((r) => r.outcomeLabel === ReplayOutcomeLabel.BAD_REGRESSION)
        .length,
      costWin: results.filter((r) => r.outcomeLabel === ReplayOutcomeLabel.COST_WIN).length,
      qualityWin: results.filter((r) => r.outcomeLabel === ReplayOutcomeLabel.QUALITY_WIN).length,
      uncertain: results.filter((r) => r.outcomeLabel === ReplayOutcomeLabel.UNCERTAIN).length,
    };
  }

  private mapCaseToDetail(c: {
    id: string;
    runId: string;
    decisionId: string | null;
    messagePreview: string;
    messageContent: string | null;
    hasOriginalContent: boolean;
    oldProvider: string;
    oldModel: string;
    oldConfidence: unknown;
    oldCostClass: string | null;
    newProvider: string;
    newModel: string;
    newConfidence: unknown;
    newCostClass: string;
    changed: boolean;
    improvementScore: unknown;
    outcomeLabel: string;
    isSuspicious: boolean;
    suspiciousReasons: string[];
    isConfirmedRegression: boolean;
    reviewNotes: string | null;
    isPromoted: boolean;
    reviewedAt: Date | null;
    createdAt: Date;
  }): ReplayCaseDetail {
    return {
      id: c.id,
      runId: c.runId,
      decisionId: c.decisionId,
      messagePreview: c.messagePreview,
      messageContent: c.messageContent,
      hasOriginalContent: c.hasOriginalContent,
      oldProvider: c.oldProvider,
      oldModel: c.oldModel,
      oldConfidence: c.oldConfidence !== null ? Number(c.oldConfidence) : null,
      oldCostClass: c.oldCostClass,
      newProvider: c.newProvider,
      newModel: c.newModel,
      newConfidence: Number(c.newConfidence),
      newCostClass: c.newCostClass,
      changed: c.changed,
      improvementScore: Number(c.improvementScore),
      outcomeLabel: c.outcomeLabel as ReplayOutcomeLabel,
      isSuspicious: c.isSuspicious,
      suspiciousReasons: c.suspiciousReasons,
      isConfirmedRegression: c.isConfirmedRegression,
      reviewNotes: c.reviewNotes,
      isPromoted: c.isPromoted,
      reviewedAt: c.reviewedAt ? c.reviewedAt.toISOString() : null,
      createdAt: c.createdAt.toISOString(),
    };
  }

  private average(values: number[]): number {
    if (values.length === 0) return 0;
    const sum = values.reduce((acc, val) => acc + val, 0);
    return sum / values.length;
  }
}
