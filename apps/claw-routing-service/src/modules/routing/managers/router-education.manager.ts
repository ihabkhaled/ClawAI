import { Injectable, Logger } from '@nestjs/common';
import {
  type FeedbackValue,
  JudgeOutcome,
  type RouterModelProfile,
  type RouterTopicProfile,
  RoutingExecutionStatus,
} from '../../../generated/prisma';
import {
  CALIBRATION_BLEND,
  EDUCATION_WINDOW_DAYS,
  MAX_COST_OUTLIER_ESTIMATE,
  MAX_LATENCY_OUTLIER_MS,
  MIN_PROFILE_SAMPLE_SIZE,
  UNVERSIONED_EVALUATOR,
} from '../constants/routing-education.constants';
import { RoutingEducationRepository } from '../repositories/routing-education.repository';
import { RouterWorkspacePriorManager } from './router-workspace-prior.manager';
import type {
  AggregateBucket,
  CreateRoutingFeedbackInput,
  LearnedDecisionCalibration,
  RollbackCalibrationResult,
  RouterModelProfileRecord,
  RouterTopicProfileRecord,
  RoutingCalibrationSummary,
  RoutingCompletedEventPayload,
  RoutingDecisionWithEducation,
  RoutingEducationSnapshot,
  RoutingFeedbackEventPayload,
  RoutingPromptHintSnapshot,
} from '../types/routing-education.types';
import type { RoutingContext, RoutingDecisionResult } from '../types/routing.types';
import {
  computeWilsonScoreInterval,
  computeWinsorizedWeightedAverage,
} from '../utilities/routing-education-statistics.utility';

@Injectable()
export class RouterEducationManager {
  private readonly logger = new Logger(RouterEducationManager.name);

  constructor(
    private readonly repository: RoutingEducationRepository,
    private readonly workspacePrior: RouterWorkspacePriorManager,
  ) {}

  async ingestExecutionOutcome(payload: RoutingCompletedEventPayload): Promise<void> {
    const decision = await this.repository.findDecisionByMessageId(payload.messageId);
    if (!decision) {
      this.logger.warn(
        `ingestExecutionOutcome: no decision found for message ${payload.messageId}`,
      );
      return;
    }

    const judgeOutcome = this.mapJudgeOutcome(payload.judgeDecision);
    const issueTags = this.buildIssueTags(payload, judgeOutcome);
    const executionSuccess = payload.executionSuccess ?? true;
    const finalStatus = payload.finalStatus ?? (executionSuccess ? 'completed' : 'failed');

    await this.repository.upsertOutcomeRecord({
      routingDecisionId: decision.id,
      messageId: payload.messageId,
      assistantMessageId: payload.assistantMessageId ?? null,
      threadId: payload.threadId,
      finalExecutionProvider: payload.provider,
      finalExecutionModel: payload.model,
      executionStatus: executionSuccess
        ? RoutingExecutionStatus.SUCCEEDED
        : RoutingExecutionStatus.FAILED,
      executionSuccess,
      actualLatencyMs: payload.latencyMs ?? null,
      finalStatus,
      fallbackUsed: payload.usedFallback ?? false,
      judgeOutcome,
      judgeConfidence: payload.judgeConfidence ?? null,
      criticScore: payload.criticScore ?? null,
      issueTags,
      revised: judgeOutcome === JudgeOutcome.REVISED,
      escalated: judgeOutcome === JudgeOutcome.ESCALATED,
      followUpSignal: payload.reRouted ? 're_routed' : null,
      evaluatorVersion: payload.evaluatorVersion ?? null,
      workspaceId: payload.workspaceId ?? null,
    });

    if (payload.workspaceId) {
      // V6 learning evolution (ADR-070) — no current caller populates this,
      // so this branch is untaken in production today; exercised directly
      // by unit tests.
      await this.workspacePrior.ingestOutcome({
        workspaceId: payload.workspaceId,
        provider: payload.provider,
        model: payload.model,
        taskFamily: payload.detectedCategory ?? 'general',
        executionSuccess,
        scoreVersion: payload.evaluatorVersion ?? null,
      });
    }

    await this.rebuildCalibrationSnapshot();
  }

  async ingestFeedbackSignal(payload: RoutingFeedbackEventPayload): Promise<void> {
    if (payload.feedback === null) {
      return;
    }

    const decision =
      (payload.routingMessageId
        ? await this.repository.findDecisionByMessageId(payload.routingMessageId)
        : null) ??
      (await this.repository.findDecisionByAssistantMessageId(payload.messageId)) ??
      (await this.repository.findDecisionByMessageId(payload.messageId));
    const feedbackValue: FeedbackValue = payload.feedback === 'positive' ? 'POSITIVE' : 'NEGATIVE';
    const taskFamily =
      payload.detectedCategory ??
      decision?.detectedCategory ??
      decision?.secondaryCategory ??
      'general';

    const input: CreateRoutingFeedbackInput = {
      routingDecisionId: decision?.id ?? null,
      messageId: payload.messageId,
      threadId: payload.threadId,
      assistantMessageId: payload.messageId,
      feedbackValue,
      source: 'thumbs',
      weight: feedbackValue === 'POSITIVE' ? 1 : 1.15,
      taskFamily,
    };

    await this.repository.createFeedbackRecord(input);
    await this.rebuildCalibrationSnapshot();
  }

  /**
   * V5 learning evolution (ADR-069) — batch recalibration first, rollback.
   *
   * Computes the full window's aggregates in memory (the "batch"), tags
   * every profile row with the new version, then commits the versioned
   * snapshot and the live profile tables as one atomic unit via
   * `commitCalibrationBatch`. A failed commit leaves the previous
   * calibration untouched and still active; a bad-but-successful commit can
   * be undone with `rollbackCalibration` without recomputing from raw
   * observations.
   */
  async rebuildCalibrationSnapshot(
    windowDays = EDUCATION_WINDOW_DAYS,
  ): Promise<RoutingEducationSnapshot> {
    const decisions = await this.repository.findEducationWindow(windowDays);
    const modelProfiles = this.computeModelProfiles(decisions);
    const topicProfiles = this.computeTopicProfiles(modelProfiles);
    const summary = this.buildSummary(windowDays, decisions, modelProfiles, topicProfiles);
    const promptHints = this.buildPromptHints(modelProfiles, topicProfiles);
    const version = `calibration-${Date.now()}`;

    const versionedModelProfiles = modelProfiles.map((profile) => ({
      ...profile,
      scoreVersion: version,
    }));
    const versionedTopicProfiles = topicProfiles.map((profile) => ({
      ...profile,
      scoreVersion: version,
    }));

    await this.repository.commitCalibrationBatch({
      version,
      windowDays,
      summary: summary as never,
      promptHints: promptHints as never,
      modelProfiles: versionedModelProfiles as never,
      topicProfiles: versionedTopicProfiles as never,
      modelProfileRows: versionedModelProfiles,
      topicProfileRows: versionedTopicProfiles,
    });

    return { version, summary, promptHints };
  }

  /**
   * V5 learning evolution (ADR-069) — rollback. Restores a previously
   * committed batch's own profile rows to the live serving tables. Omit
   * `targetVersion` to roll back to the snapshot immediately preceding the
   * currently active one.
   */
  async rollbackCalibration(targetVersion?: string): Promise<RollbackCalibrationResult> {
    const target = targetVersion
      ? await this.repository.getCalibrationSnapshotByVersion(targetVersion)
      : await this.repository.getPreviousCalibrationSnapshot();

    if (!target) {
      return { rolledBack: false, restoredVersion: null, reason: 'SNAPSHOT_NOT_FOUND' };
    }
    if (target.modelProfiles === null || target.topicProfiles === null) {
      return { rolledBack: false, restoredVersion: target.version, reason: 'NO_ARCHIVED_PROFILES' };
    }

    await this.repository.restoreCalibrationSnapshot({
      version: target.version,
      modelProfileRows: target.modelProfiles as RouterModelProfileRecord[],
      topicProfileRows: target.topicProfiles as RouterTopicProfileRecord[],
    });

    return { rolledBack: true, restoredVersion: target.version, reason: null };
  }

  async getLatestSnapshot(): Promise<RoutingEducationSnapshot | null> {
    const snapshot = await this.repository.getLatestCalibrationSnapshot();
    if (!snapshot) {
      return null;
    }

    return {
      version: snapshot.version,
      summary: snapshot.summary as RoutingCalibrationSummary,
      promptHints: snapshot.promptHints as RoutingPromptHintSnapshot,
    };
  }

  async listModelProfiles(taskFamily?: string, limit = 25): Promise<RouterModelProfileRecord[]> {
    const profiles = await this.repository.listModelProfiles(taskFamily, limit);
    return profiles.map((profile) => this.mapModelProfile(profile));
  }

  async listTopicProfiles(taskFamily?: string, limit = 25): Promise<RouterTopicProfileRecord[]> {
    const profiles = await this.repository.listTopicProfiles(taskFamily, limit);
    return profiles.map((profile) => this.mapTopicProfile(profile));
  }

  async calibrateDecision(
    decision: RoutingDecisionResult,
    context: RoutingContext,
  ): Promise<LearnedDecisionCalibration> {
    if (decision.selectedProvider === 'UNAVAILABLE') {
      return { decision, changed: false };
    }
    const taskFamily = decision.detectedCategory ?? 'general';
    const currentProfile = await this.repository.findModelProfile(
      decision.selectedProvider,
      decision.selectedModel,
      taskFamily,
    );
    const bestProfile = await this.repository.findBestModelProfile(taskFamily);

    const calibrated: RoutingDecisionResult = { ...decision };
    // V5 learning evolution (ADR-069) — minimum-samples gating. A profile
    // below MIN_PROFILE_SAMPLE_SIZE has not earned any pull on the decision
    // yet; above that floor, its pull is scaled by its own confidenceInProfile
    // rather than always applied at the fixed CALIBRATION_BLEND weight, so a
    // thin profile can no longer sway confidence as hard as a well-sampled one.
    if (currentProfile && Number(currentProfile.sampleSize) >= MIN_PROFILE_SAMPLE_SIZE) {
      const effectiveBlend = CALIBRATION_BLEND * Number(currentProfile.confidenceInProfile);
      calibrated.confidence = this.clamp01(
        decision.confidence * (1 - effectiveBlend) +
          Number(currentProfile.calibrationTrustScore) * effectiveBlend,
      );
      calibrated.reasonTags = [...calibrated.reasonTags, 'profile_calibrated'];
    }

    if (
      this.shouldOverrideToBestProfile(decision, currentProfile, bestProfile, taskFamily, context)
    ) {
      const profile = bestProfile;
      if (profile) {
        calibrated.selectedProvider = profile.provider;
        calibrated.selectedModel = profile.model;
        calibrated.confidence = this.clamp01(
          Math.max(calibrated.confidence, Number(profile.calibrationTrustScore)),
        );
        calibrated.reasonTags = [...calibrated.reasonTags, 'learned_profile_override'];
        return this.withWorkspaceNudge(calibrated, true, context);
      }
    }

    return this.withWorkspaceNudge(calibrated, calibrated !== decision, context);
  }

  /**
   * V6 learning evolution (ADR-070) — applied last, after any global-tier
   * override to best profile has already picked the final
   * selectedProvider/selectedModel. This method only ever adjusts
   * `confidence`; it has no path that can change which provider or model
   * was selected, by construction.
   */
  private async withWorkspaceNudge(
    calibrated: RoutingDecisionResult,
    changed: boolean,
    context: RoutingContext,
  ): Promise<LearnedDecisionCalibration> {
    const nudge = await this.workspacePrior.resolveNudge(context, calibrated);
    if (!nudge.applied) {
      return { decision: calibrated, changed };
    }
    return {
      decision: {
        ...calibrated,
        confidence: nudge.confidence,
        reasonTags: [...calibrated.reasonTags, 'workspace_personalized'],
      },
      changed: true,
    };
  }

  private shouldOverrideToBestProfile(
    decision: RoutingDecisionResult,
    currentProfile: RouterModelProfile | null,
    bestProfile: RouterModelProfile | null,
    taskFamily: string,
    context: RoutingContext,
  ): boolean {
    if (!bestProfile) {
      return false;
    }
    if (Number(bestProfile.sampleSize) < MIN_PROFILE_SAMPLE_SIZE) {
      return false;
    }
    if (this.isPrivacyTaskFamily(taskFamily)) {
      return false;
    }
    if (this.isImageOrFileProvider(decision.selectedProvider)) {
      return false;
    }
    if (decision.confidence >= 0.88) {
      return false;
    }
    if (!this.isProviderUsable(bestProfile.provider, context)) {
      return false;
    }
    if (
      decision.selectedProvider === bestProfile.provider &&
      decision.selectedModel === bestProfile.model
    ) {
      return false;
    }
    const currentSuccess = currentProfile ? Number(currentProfile.weightedSuccessScore) : 0.5;
    return Number(bestProfile.weightedSuccessScore) - currentSuccess > 0.12;
  }

  private isPrivacyTaskFamily(taskFamily: string): boolean {
    return taskFamily === 'privacy' || taskFamily === 'medical' || taskFamily === 'legal';
  }

  private isImageOrFileProvider(provider: string): boolean {
    return provider.startsWith('IMAGE_') || provider === 'FILE_GENERATION';
  }

  private computeModelProfiles(
    decisions: RoutingDecisionWithEducation[],
  ): RouterModelProfileRecord[] {
    const aggregates = new Map<string, AggregateBucket>();
    for (const decision of decisions) {
      this.aggregateDecision(decision, aggregates);
    }
    return [...aggregates.values()].map((bucket) => this.bucketToProfile(bucket));
  }

  private aggregateDecision(
    decision: RoutingDecisionWithEducation,
    aggregates: Map<string, AggregateBucket>,
  ): void {
    const outcome = decision.outcomes[0] ?? null;
    const taskFamily = decision.detectedCategory ?? 'general';
    const topicKey = decision.secondaryCategory ?? taskFamily;
    const provider = outcome?.finalExecutionProvider ?? decision.selectedProvider;
    const model = outcome?.finalExecutionModel ?? decision.selectedModel;
    const freshness = this.computeFreshness(decision.createdAt);
    const feedback = this.summarizeFeedback(decision.feedbackRecords);

    const bucketKey = `${provider}::${model}::${taskFamily}::${topicKey}`;
    const bucket =
      aggregates.get(bucketKey) ?? this.createEmptyBucket(provider, model, taskFamily, topicKey);

    bucket.routeCount += 1;
    bucket.totalWeight += freshness;
    bucket.weightedSuccess += this.computeWeightedQuality(
      outcome,
      feedback.positive,
      feedback.negative,
      freshness,
    );
    bucket.weightedDissatisfaction += this.computeWeightedDissatisfaction(
      outcome,
      feedback.negative,
      freshness,
    );
    bucket.thumbsUpWeight += feedback.positive * freshness;
    bucket.thumbsDownWeight += feedback.negative * freshness;
    this.applyJudgeWeights(bucket, outcome, freshness);
    this.applyLatencyAndCostWeights(bucket, outcome, freshness);
    this.applyOutcomeWeights(bucket, outcome, freshness);
    this.applyEvaluatorAttribution(bucket, outcome);

    aggregates.set(bucketKey, bucket);
  }

  private createEmptyBucket(
    provider: string,
    model: string,
    taskFamily: string,
    topicKey: string,
  ): AggregateBucket {
    return {
      provider,
      model,
      taskFamily,
      topicKey,
      routeCount: 0,
      totalWeight: 0,
      weightedSuccess: 0,
      weightedDissatisfaction: 0,
      thumbsUpWeight: 0,
      thumbsDownWeight: 0,
      judgeVerifiedWeight: 0,
      judgeRevisedWeight: 0,
      judgeEscalatedWeight: 0,
      latencySamples: [],
      costSamples: [],
      fallbackSuccessWeight: 0,
      fallbackWeight: 0,
      hallucinationWeight: 0,
      evaluatorVersions: new Set(),
    };
  }

  private applyJudgeWeights(
    bucket: AggregateBucket,
    outcome: RoutingDecisionWithEducation['outcomes'][number] | null,
    freshness: number,
  ): void {
    bucket.judgeVerifiedWeight +=
      (outcome?.judgeOutcome === JudgeOutcome.VERIFIED ? 1 : 0) * freshness;
    bucket.judgeRevisedWeight +=
      (outcome?.judgeOutcome === JudgeOutcome.REVISED ? 1 : 0) * freshness;
    bucket.judgeEscalatedWeight +=
      (outcome?.judgeOutcome === JudgeOutcome.ESCALATED ? 1 : 0) * freshness;
  }

  // V5 learning evolution (ADR-069) — outlier control. Raw freshness-weighted
  // samples are collected here; bucketToProfile winsorizes them via
  // computeWinsorizedWeightedAverage instead of averaging a plain running
  // sum, so one anomalous observation (e.g. a 60s latency spike) cannot
  // swing the whole-window aggregate on its own.
  private applyLatencyAndCostWeights(
    bucket: AggregateBucket,
    outcome: RoutingDecisionWithEducation['outcomes'][number] | null,
    freshness: number,
  ): void {
    if (typeof outcome?.actualLatencyMs === 'number') {
      bucket.latencySamples.push({ value: outcome.actualLatencyMs, weight: freshness });
    }
    const cost = outcome?.actualCostEstimate;
    if (typeof cost === 'object' || typeof cost === 'number') {
      bucket.costSamples.push({ value: Number(cost), weight: freshness });
    }
  }

  // V5 learning evolution (ADR-069) — evaluator attribution. Records which
  // evaluator/rubric version produced each judge outcome so the aggregate
  // is never a silent blend of scores from different evaluators.
  private applyEvaluatorAttribution(
    bucket: AggregateBucket,
    outcome: RoutingDecisionWithEducation['outcomes'][number] | null,
  ): void {
    if (!outcome) {
      return;
    }
    bucket.evaluatorVersions.add(outcome.evaluatorVersion ?? UNVERSIONED_EVALUATOR);
  }

  private applyOutcomeWeights(
    bucket: AggregateBucket,
    outcome: RoutingDecisionWithEducation['outcomes'][number] | null,
    freshness: number,
  ): void {
    if (!outcome) {
      return;
    }
    bucket.fallbackWeight += freshness;
    if (outcome.fallbackUsed === true && outcome.executionSuccess) {
      bucket.fallbackSuccessWeight += freshness;
    }
    if (this.hasHallucinationMarker(outcome.issueTags)) {
      bucket.hallucinationWeight += freshness;
    }
  }

  private bucketToProfile(bucket: AggregateBucket): RouterModelProfileRecord {
    const sampleSize = bucket.routeCount;
    const smoothing = 5;
    const prior = 0.55;
    const smoothedSuccess =
      (bucket.weightedSuccess + smoothing * prior) / Math.max(bucket.totalWeight + smoothing, 1);
    const dissatRate = bucket.weightedDissatisfaction / Math.max(bucket.totalWeight, 1);
    const hallucinationRisk = bucket.hallucinationWeight / Math.max(bucket.totalWeight, 1);
    const confidenceInProfile = this.clamp01(
      Math.min(1, sampleSize / 12) * (1 - hallucinationRisk * 0.6) * (1 - dissatRate * 0.3),
    );
    // V5 learning evolution (ADR-069) — approximates a Wilson score interval
    // around the smoothed success rate using routeCount as the effective
    // sample size. smoothedSuccess is a continuous, freshness-weighted
    // quality score rather than a strict binomial proportion, so this is a
    // bounded-uncertainty heuristic, not an exact statistical guarantee —
    // documented rather than silently treated as one.
    const successInterval = computeWilsonScoreInterval(smoothedSuccess, sampleSize);

    return {
      provider: bucket.provider,
      model: bucket.model,
      taskFamily: bucket.taskFamily,
      topicKey: bucket.topicKey,
      routeCount: bucket.routeCount,
      successRate: smoothedSuccess,
      thumbsUpRate: bucket.thumbsUpWeight / Math.max(bucket.totalWeight, 1),
      thumbsDownRate: bucket.thumbsDownWeight / Math.max(bucket.totalWeight, 1),
      judgeVerifiedRate: bucket.judgeVerifiedWeight / Math.max(bucket.totalWeight, 1),
      judgeRevisedRate: bucket.judgeRevisedWeight / Math.max(bucket.totalWeight, 1),
      judgeEscalatedRate: bucket.judgeEscalatedWeight / Math.max(bucket.totalWeight, 1),
      averageLatencyMs: Math.round(
        computeWinsorizedWeightedAverage(bucket.latencySamples, MAX_LATENCY_OUTLIER_MS),
      ),
      averageCostEstimate: computeWinsorizedWeightedAverage(
        bucket.costSamples,
        MAX_COST_OUTLIER_ESTIMATE,
      ),
      fallbackSuccessRate: bucket.fallbackSuccessWeight / Math.max(bucket.fallbackWeight, 1),
      hallucinationRiskScore: hallucinationRisk,
      calibrationTrustScore: this.clamp01(smoothedSuccess * 0.7 + confidenceInProfile * 0.3),
      weightedSuccessScore: smoothedSuccess,
      weightedDissatisfactionScore: dissatRate,
      sampleSize,
      confidenceInProfile,
      // scoreVersion is stamped by rebuildCalibrationSnapshot once the batch
      // version is known; left null here so this method stays a pure
      // function of the bucket.
      scoreVersion: null,
      successRateLowerBound: successInterval.lowerBound,
      successRateUpperBound: successInterval.upperBound,
      evaluatorVersions: [...bucket.evaluatorVersions].sort(),
    };
  }

  private computeTopicProfiles(
    modelProfiles: RouterModelProfileRecord[],
  ): RouterTopicProfileRecord[] {
    const grouped = new Map<string, RouterModelProfileRecord[]>();

    for (const profile of modelProfiles) {
      const key = `${profile.taskFamily}::${profile.topicKey}`;
      const items = grouped.get(key) ?? [];
      items.push(profile);
      grouped.set(key, items);
    }

    return [...grouped.entries()].map(([key, items]) => {
      const [taskFamily, topicKey] = key.split('::');
      const best = [...items].sort(
        (a, b) =>
          b.weightedSuccessScore - a.weightedSuccessScore ||
          b.confidenceInProfile - a.confidenceInProfile,
      )[0];
      const avgSuccess =
        items.reduce((sum, item) => sum + item.weightedSuccessScore, 0) / Math.max(items.length, 1);
      const topicRouteCount = items.reduce((sum, item) => sum + item.routeCount, 0);
      const topicSuccessInterval = computeWilsonScoreInterval(avgSuccess, topicRouteCount);
      const evaluatorVersions = [
        ...new Set(items.flatMap((item) => item.evaluatorVersions)),
      ].sort();
      const ambiguityScore =
        items.length > 1
          ? this.clamp01(
              Math.abs(
                (items[0]?.weightedSuccessScore ?? 0) - (items[1]?.weightedSuccessScore ?? 0.5),
              ) < 0.08
                ? 0.8
                : 0.2,
            )
          : 0;

      return {
        taskFamily: taskFamily ?? 'general',
        topicKey: topicKey ?? 'general',
        bestProvider: best?.provider ?? null,
        bestModel: best?.model ?? null,
        routeCount: topicRouteCount,
        successRate: avgSuccess,
        thumbsUpRate:
          items.reduce((sum, item) => sum + item.thumbsUpRate, 0) / Math.max(items.length, 1),
        thumbsDownRate:
          items.reduce((sum, item) => sum + item.thumbsDownRate, 0) / Math.max(items.length, 1),
        judgeVerifiedRate:
          items.reduce((sum, item) => sum + item.judgeVerifiedRate, 0) / Math.max(items.length, 1),
        judgeEscalatedRate:
          items.reduce((sum, item) => sum + item.judgeEscalatedRate, 0) / Math.max(items.length, 1),
        fallbackSuccessRate:
          items.reduce((sum, item) => sum + item.fallbackSuccessRate, 0) /
          Math.max(items.length, 1),
        weightedSuccessScore: best?.weightedSuccessScore ?? avgSuccess,
        ambiguityScore,
        confidenceInProfile:
          items.reduce((sum, item) => sum + item.confidenceInProfile, 0) /
          Math.max(items.length, 1),
        // scoreVersion is stamped by rebuildCalibrationSnapshot; see
        // bucketToProfile for the same convention on model profiles.
        scoreVersion: null,
        successRateLowerBound: topicSuccessInterval.lowerBound,
        successRateUpperBound: topicSuccessInterval.upperBound,
        evaluatorVersions,
      };
    });
  }

  private buildSummary(
    windowDays: number,
    decisions: RoutingDecisionWithEducation[],
    modelProfiles: RouterModelProfileRecord[],
    topicProfiles: RouterTopicProfileRecord[],
  ): RoutingCalibrationSummary {
    return {
      windowDays,
      decisionsAnalyzed: decisions.length,
      feedbackEvents: decisions.reduce((sum, decision) => sum + decision.feedbackRecords.length, 0),
      outcomesAnalyzed: decisions.reduce((sum, decision) => sum + decision.outcomes.length, 0),
      topTaskFamilies: topicProfiles
        .sort((a, b) => b.weightedSuccessScore - a.weightedSuccessScore)
        .slice(0, 8)
        .map((profile) => ({
          taskFamily: profile.taskFamily,
          weightedSuccessScore: profile.weightedSuccessScore,
          bestProvider: profile.bestProvider,
          bestModel: profile.bestModel,
          confidenceInProfile: profile.confidenceInProfile,
        })),
      cautionModels: modelProfiles
        .filter((profile) => profile.sampleSize >= MIN_PROFILE_SAMPLE_SIZE)
        .sort((a, b) => b.weightedDissatisfactionScore - a.weightedDissatisfactionScore)
        .slice(0, 8)
        .map((profile) => ({
          provider: profile.provider,
          model: profile.model,
          taskFamily: profile.taskFamily,
          weightedDissatisfactionScore: profile.weightedDissatisfactionScore,
          sampleSize: profile.sampleSize,
        })),
    };
  }

  private buildPromptHints(
    modelProfiles: RouterModelProfileRecord[],
    topicProfiles: RouterTopicProfileRecord[],
  ): RoutingPromptHintSnapshot {
    return {
      bestModelsByTaskFamily: modelProfiles
        .filter((profile) => profile.sampleSize >= MIN_PROFILE_SAMPLE_SIZE)
        .sort(
          (a, b) =>
            b.weightedSuccessScore - a.weightedSuccessScore ||
            b.confidenceInProfile - a.confidenceInProfile,
        )
        .slice(0, 12)
        .map((profile) => ({
          taskFamily: profile.taskFamily,
          provider: profile.provider,
          model: profile.model,
          weightedSuccessScore: profile.weightedSuccessScore,
          confidenceInProfile: profile.confidenceInProfile,
        })),
      cautionModels: modelProfiles
        .filter((profile) => profile.sampleSize >= MIN_PROFILE_SAMPLE_SIZE)
        .sort((a, b) => b.weightedDissatisfactionScore - a.weightedDissatisfactionScore)
        .slice(0, 8)
        .map((profile) => ({
          provider: profile.provider,
          model: profile.model,
          taskFamily: profile.taskFamily,
          weightedDissatisfactionScore: profile.weightedDissatisfactionScore,
        })),
      ambiguousTaskFamilies: topicProfiles
        .filter((profile) => profile.ambiguityScore >= 0.5)
        .sort((a, b) => b.ambiguityScore - a.ambiguityScore)
        .slice(0, 8)
        .map((profile) => ({
          taskFamily: profile.taskFamily,
          ambiguityScore: profile.ambiguityScore,
          recommendation:
            'Prefer a stronger general thinker or search-capable fallback when evidence is sparse.',
        })),
    };
  }

  private summarizeFeedback(records: RoutingDecisionWithEducation['feedbackRecords']): {
    positive: number;
    negative: number;
  } {
    return records.reduce(
      (acc, record) => {
        if (record.feedbackValue === 'POSITIVE') {
          acc.positive += Number(record.weight);
        }
        if (record.feedbackValue === 'NEGATIVE') {
          acc.negative += Number(record.weight);
        }
        return acc;
      },
      { positive: 0, negative: 0 },
    );
  }

  private computeFreshness(createdAt: Date): number {
    const ageDays = Math.max(0, (Date.now() - createdAt.getTime()) / 86_400_000);
    return 1 / (1 + ageDays / EDUCATION_WINDOW_DAYS);
  }

  private computeWeightedQuality(
    outcome: RoutingDecisionWithEducation['outcomes'][number] | null,
    thumbsUpWeight: number,
    thumbsDownWeight: number,
    freshness: number,
  ): number {
    let score = 0.5;
    if (outcome?.executionSuccess === true) {
      score += 0.22;
    }
    if (outcome?.judgeOutcome === JudgeOutcome.VERIFIED) {
      score += 0.2;
    }
    if (outcome?.judgeOutcome === JudgeOutcome.REVISED) {
      score -= 0.08;
    }
    if (outcome?.judgeOutcome === JudgeOutcome.ESCALATED) {
      score -= 0.25;
    }
    score += Math.min(0.18, thumbsUpWeight * 0.18);
    score -= Math.min(0.3, thumbsDownWeight * 0.22);
    if (outcome?.fallbackUsed === true) {
      score -= 0.05;
    }
    if (outcome && this.hasHallucinationMarker(outcome.issueTags)) {
      score -= 0.18;
    }
    return this.clamp01(score) * freshness;
  }

  private computeWeightedDissatisfaction(
    outcome: RoutingDecisionWithEducation['outcomes'][number] | null,
    thumbsDownWeight: number,
    freshness: number,
  ): number {
    let score = 0;
    score += Math.min(0.45, thumbsDownWeight * 0.3);
    if (outcome?.judgeOutcome === JudgeOutcome.REVISED) {
      score += 0.15;
    }
    if (outcome?.judgeOutcome === JudgeOutcome.ESCALATED) {
      score += 0.35;
    }
    if (outcome && this.hasHallucinationMarker(outcome.issueTags)) {
      score += 0.25;
    }
    return this.clamp01(score) * freshness;
  }

  private buildIssueTags(
    payload: RoutingCompletedEventPayload,
    judgeOutcome: JudgeOutcome,
  ): string[] {
    const tags: string[] = [];
    if (payload.executionSuccess === false) {
      tags.push('execution_failed');
    }
    if (typeof payload.errorMessage === 'string' && payload.errorMessage.length > 0) {
      tags.push('execution_error');
    }
    if (payload.reRouted === true) {
      tags.push('re_routed');
    }
    if (judgeOutcome === JudgeOutcome.REVISED) {
      tags.push('judge_revised');
    }
    if (judgeOutcome === JudgeOutcome.ESCALATED) {
      tags.push('judge_escalated', 'hallucination_risk');
    }
    return tags;
  }

  private mapJudgeOutcome(value?: string): JudgeOutcome {
    switch (value) {
      case 'ACCEPT':
      case 'VERIFIED':
        return JudgeOutcome.VERIFIED;
      case 'REVISE':
      case 'REVISED':
        return JudgeOutcome.REVISED;
      case 'ESCALATE':
      case 'ESCALATED':
        return JudgeOutcome.ESCALATED;
      case 'UNAVAILABLE':
        return JudgeOutcome.UNAVAILABLE;
      default:
        return JudgeOutcome.NONE;
    }
  }

  private hasHallucinationMarker(issueTags: string[]): boolean {
    return issueTags.some((tag) =>
      [
        'hallucination',
        'hallucination_risk',
        'wrong_task_match',
        'topic_drift',
        'schema_invalid',
      ].includes(tag),
    );
  }

  private isProviderUsable(provider: string, context: RoutingContext): boolean {
    if (provider === 'local-ollama') {
      return context.runtimeHealth?.['OLLAMA'] ?? false;
    }
    const healthMap = context.connectorHealth;
    if (!healthMap) {
      return false;
    }
    const entry = Object.entries(healthMap).find(([name]) => name === provider);
    return entry?.[1] ?? false;
  }

  private clamp01(value: number): number {
    return Math.max(0, Math.min(1, value));
  }

  private mapModelProfile(profile: RouterModelProfile): RouterModelProfileRecord {
    return {
      provider: profile.provider,
      model: profile.model,
      taskFamily: profile.taskFamily,
      topicKey: profile.topicKey,
      routeCount: profile.routeCount,
      successRate: this.decimalToNumber(profile.successRate),
      thumbsUpRate: this.decimalToNumber(profile.thumbsUpRate),
      thumbsDownRate: this.decimalToNumber(profile.thumbsDownRate),
      judgeVerifiedRate: this.decimalToNumber(profile.judgeVerifiedRate),
      judgeRevisedRate: this.decimalToNumber(profile.judgeRevisedRate),
      judgeEscalatedRate: this.decimalToNumber(profile.judgeEscalatedRate),
      averageLatencyMs: profile.averageLatencyMs,
      averageCostEstimate: this.decimalToNumber(profile.averageCostEstimate),
      fallbackSuccessRate: this.decimalToNumber(profile.fallbackSuccessRate),
      hallucinationRiskScore: this.decimalToNumber(profile.hallucinationRiskScore),
      calibrationTrustScore: this.decimalToNumber(profile.calibrationTrustScore),
      weightedSuccessScore: this.decimalToNumber(profile.weightedSuccessScore),
      weightedDissatisfactionScore: this.decimalToNumber(profile.weightedDissatisfactionScore),
      sampleSize: profile.sampleSize,
      confidenceInProfile: this.decimalToNumber(profile.confidenceInProfile),
      scoreVersion: profile.scoreVersion,
      successRateLowerBound: this.decimalToNumberOrNull(profile.successRateLowerBound),
      successRateUpperBound: this.decimalToNumberOrNull(profile.successRateUpperBound),
      evaluatorVersions: profile.evaluatorVersions,
    };
  }

  private mapTopicProfile(profile: RouterTopicProfile): RouterTopicProfileRecord {
    return {
      taskFamily: profile.taskFamily,
      topicKey: profile.topicKey,
      bestProvider: profile.bestProvider,
      bestModel: profile.bestModel,
      routeCount: profile.routeCount,
      successRate: this.decimalToNumber(profile.successRate),
      thumbsUpRate: this.decimalToNumber(profile.thumbsUpRate),
      thumbsDownRate: this.decimalToNumber(profile.thumbsDownRate),
      judgeVerifiedRate: this.decimalToNumber(profile.judgeVerifiedRate),
      judgeEscalatedRate: this.decimalToNumber(profile.judgeEscalatedRate),
      fallbackSuccessRate: this.decimalToNumber(profile.fallbackSuccessRate),
      weightedSuccessScore: this.decimalToNumber(profile.weightedSuccessScore),
      ambiguityScore: this.decimalToNumber(profile.ambiguityScore),
      confidenceInProfile: this.decimalToNumber(profile.confidenceInProfile),
      scoreVersion: profile.scoreVersion,
      successRateLowerBound: this.decimalToNumberOrNull(profile.successRateLowerBound),
      successRateUpperBound: this.decimalToNumberOrNull(profile.successRateUpperBound),
      evaluatorVersions: profile.evaluatorVersions,
    };
  }

  private decimalToNumberOrNull(value: { toNumber: () => number } | number | null): number | null {
    return value === null ? null : this.decimalToNumber(value);
  }

  private decimalToNumber(value: { toNumber: () => number } | number): number {
    if (typeof value === 'number') {
      return value;
    }

    return value.toNumber();
  }
}
