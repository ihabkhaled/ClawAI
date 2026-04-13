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
import type {
  ExportBundle,
  PromotedTestFixture,
  ReplayCaseDetail,
  ReplayRunSummary,
  RunComparisonDelta,
  RunComparisonResult,
} from '../types/replay-run.types';
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

    const exportCases = cases.map((c) => ({
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
    }));

    return {
      runId,
      runName: run?.name ?? null,
      exportedAt: new Date().toISOString(),
      totalCases: exportCases.length,
      cases: exportCases,
      claudePrompt: this.buildClaudePrompt(runId, run?.name ?? null, exportCases),
    };
  }

  async promoteCase(caseId: string): Promise<PromotedTestFixture> {
    const c = await this.casesRepository.promote(caseId);
    this.logger.log(`promoteCase: case ${caseId} marked as promoted`);
    return {
      caseId: c.id,
      testDescription: this.buildTestDescription(c.messagePreview, c.oldProvider, c.newProvider),
      testCode: this.buildTestFixtureCode(
        c.messagePreview,
        c.messageContent,
        c.oldProvider,
        c.oldModel,
        c.newProvider,
        c.newModel,
      ),
    };
  }

  async compareRuns(runId1: string, runId2: string): Promise<RunComparisonResult> {
    const [runA, runB] = await Promise.all([
      this.runsRepository.findById(runId1),
      this.runsRepository.findById(runId2),
    ]);

    const summaryA = this.mapRunToSummary(runA);
    const summaryB = this.mapRunToSummary(runB);

    const delta = this.buildRunDelta(summaryA, summaryB);
    const improved =
      delta.avgConfNewDelta > 0 ||
      delta.avgImprovementDelta > 0 ||
      (delta.suspiciousCount < 0 && delta.avgConfNewDelta >= 0);

    return { runA: summaryA, runB: summaryB, delta, improved };
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

  private mapRunToSummary(
    run: {
      id: string;
      name: string | null;
      totalReplayed: number;
      changedCount: number;
      suspiciousCount: number;
      avgConfOld: unknown;
      avgConfNew: unknown;
      avgImprovement: unknown;
      labelBreakdown: unknown;
      createdAt: Date;
    } | null,
  ): ReplayRunSummary {
    return {
      id: run?.id ?? '',
      name: run?.name ?? null,
      totalReplayed: run?.totalReplayed ?? 0,
      changedCount: run?.changedCount ?? 0,
      suspiciousCount: run?.suspiciousCount ?? 0,
      avgConfOld: run ? Number(run.avgConfOld) : 0,
      avgConfNew: run ? Number(run.avgConfNew) : 0,
      avgImprovement: run ? Number(run.avgImprovement) : 0,
      labelBreakdown: (run?.labelBreakdown ?? {
        correctImprovement: 0,
        badRegression: 0,
        costWin: 0,
        qualityWin: 0,
        uncertain: 0,
      }) as LabelBreakdown,
      createdAt: run ? run.createdAt.toISOString() : new Date().toISOString(),
    };
  }

  private buildRunDelta(a: ReplayRunSummary, b: ReplayRunSummary): RunComparisonDelta {
    return {
      totalReplayed: b.totalReplayed - a.totalReplayed,
      changedCount: b.changedCount - a.changedCount,
      suspiciousCount: b.suspiciousCount - a.suspiciousCount,
      avgConfOldDelta: b.avgConfOld - a.avgConfOld,
      avgConfNewDelta: b.avgConfNew - a.avgConfNew,
      avgImprovementDelta: b.avgImprovement - a.avgImprovement,
      labelBreakdownDelta: {
        correctImprovement:
          b.labelBreakdown.correctImprovement - a.labelBreakdown.correctImprovement,
        badRegression: b.labelBreakdown.badRegression - a.labelBreakdown.badRegression,
        costWin: b.labelBreakdown.costWin - a.labelBreakdown.costWin,
        qualityWin: b.labelBreakdown.qualityWin - a.labelBreakdown.qualityWin,
        uncertain: b.labelBreakdown.uncertain - a.labelBreakdown.uncertain,
      },
    };
  }

  private buildClaudePrompt(
    runId: string,
    runName: string | null,
    cases: {
      id: string;
      messagePreview: string;
      originalPrompt: string | null;
      originalDecision: {
        provider: string;
        model: string;
        confidence: number | null;
        costClass: string | null;
      };
      replayDecision: {
        provider: string;
        model: string;
        confidence: number;
        costClass: string | null;
      };
      outcomeLabel: string;
      suspiciousReasons: string[];
      improvementScore: number;
    }[],
  ): string {
    const casesSummary = cases
      .map(
        (c, i) =>
          `Case ${String(i + 1)} [${c.id}]:\n` +
          `  Message: "${c.messagePreview}"\n` +
          `  Original: ${c.originalDecision.provider}/${c.originalDecision.model} (conf=${String(c.originalDecision.confidence ?? 'n/a')}, cost=${c.originalDecision.costClass ?? 'n/a'})\n` +
          `  Replay:   ${c.replayDecision.provider}/${c.replayDecision.model} (conf=${String(c.replayDecision.confidence)}, cost=${c.replayDecision.costClass ?? 'n/a'})\n` +
          `  Label: ${c.outcomeLabel} | Score: ${String(c.improvementScore)} | Flags: ${c.suspiciousReasons.join(', ') || 'none'}`,
      )
      .join('\n\n');

    return (
      `## Routing Regression Analysis Request\n\n` +
      `Run ID: ${runId}\n` +
      `Run Name: ${runName ?? 'unnamed'}\n` +
      `Suspicious Cases: ${String(cases.length)}\n\n` +
      `### Cases\n\n${casesSummary}\n\n` +
      `### Required Output — Return EXACTLY 3 sections\n\n` +
      `**1. DIAGNOSIS**\n` +
      `Identify the root cause. Be specific: which routing rule, policy, model assignment, or confidence threshold is wrong.\n\n` +
      `**2. CODE / POLICY CHANGES**\n` +
      `Provide exact file paths and minimal code or JSON policy changes. No prose — just the diff or config block.\n\n` +
      `**3. REGRESSION TESTS**\n` +
      `Provide Jest test cases using the pattern from replay.manager.spec.ts that would catch this regression.`
    );
  }

  private buildTestDescription(
    messagePreview: string,
    oldProvider: string,
    newProvider: string,
  ): string {
    return `regression: "${messagePreview.slice(0, 60)}" should NOT change from ${oldProvider} to ${newProvider}`;
  }

  private buildTestFixtureCode(
    messagePreview: string,
    messageContent: string | null,
    oldProvider: string,
    oldModel: string,
    newProvider: string,
    newModel: string,
  ): string {
    const safeContent = (messageContent ?? messagePreview)
      .slice(0, 200)
      .replaceAll('`', "'")
      .replaceAll('\\', '\\\\');

    return (
      `it('should NOT route away from ${oldProvider}/${oldModel} for this message', async () => {\n` +
      `  routingManager.evaluateRoute.mockResolvedValue({\n` +
      `    ...mockNewDecisionResult,\n` +
      `    selectedProvider: '${newProvider}',\n` +
      `    selectedModel: '${newModel}',\n` +
      `  });\n` +
      `  decisionsRepo.findRecent.mockResolvedValue([{\n` +
      `    ...mockDecision,\n` +
      `    messageContent: \`${safeContent}\`,\n` +
      `    selectedProvider: '${oldProvider}',\n` +
      `    selectedModel: '${oldModel}',\n` +
      `  }]);\n\n` +
      `  const result = await manager.replayDecisions({ limit: 1 });\n\n` +
      `  // This regression test confirms the router must NOT change from ${oldProvider}/${oldModel}\n` +
      `  expect(result.results[0]?.changed).toBe(false);\n` +
      `  expect(result.results[0]?.originalDecision.selectedProvider).toBe('${oldProvider}');\n` +
      `});`
    );
  }
}
