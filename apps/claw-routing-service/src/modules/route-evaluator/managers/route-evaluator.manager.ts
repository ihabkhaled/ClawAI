import { Injectable, Logger, Optional } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AppConfig } from '../../../app/config/app.config';
import { DomainTag, RoutingMode } from '../../../generated/prisma';
import { ClassifierManager } from '../../classifier/managers/classifier.manager';
import { LearningLoopManager } from '../../learning-loop/managers/learning-loop.manager';
import { CircuitBreakerManager } from '../../reliability/managers/circuit-breaker.manager';
import { RouterModelRegistryRepository } from '../../router-models/repositories/router-model-registry.repository';
import { type RouterModelRegistryRecord } from '../../router-models/types/router-model-registry.types';
import { RoutingPoliciesRepository } from '../../routing/repositories/routing-policies.repository';
import { ScoringEngineManager } from '../../scoring/managers/scoring-engine.manager';
import { type ScoringCandidate, type ScoringInput } from '../../scoring/types/scoring.types';
import { resolvePolicyWeights } from '../../scoring/utilities/policy-weights-resolver.utility';
import { routingDecisionV2Schema } from '../schemas/routing-decision-v2.schema';
import {
  type EvaluateInputV2,
  type NoExecutionModelIssue,
  type RoutingDecisionV2,
} from '../types/route-evaluator.types';
import { applyRouteOnlyContract } from '../utilities/route-only-guard.utility';
import { runtimeTypeOf } from '../utilities/runtime-type.utility';

@Injectable()
export class RouteEvaluatorManager {
  private readonly logger = new Logger(RouteEvaluatorManager.name);

  constructor(
    private readonly classifier: ClassifierManager,
    private readonly registryRepo: RouterModelRegistryRepository,
    private readonly scorer: ScoringEngineManager,
    private readonly circuit: CircuitBreakerManager,
    @Optional() private readonly policiesRepo?: RoutingPoliciesRepository,
    // Phase 9 — Optional so existing tests that build the manager
    // with just the required deps keep working. When unset, the
    // learnedSuccess dimension defaults to neutral (0.6).
    @Optional() private readonly learningLoop?: LearningLoopManager,
  ) {}

  async evaluate(input: EvaluateInputV2): Promise<RoutingDecisionV2> {
    this.logger.debug(`evaluate length=${input.messageContent.length}`);

    const classification = this.classifier.classify({
      messageContent: input.messageContent,
      attachedFileMimeTypes: input.attachedFileMimeTypes,
    });

    const mode = input.routingMode ?? RoutingMode.AUTO;
    const policyId = input.policyId ?? 'default';

    if (mode === RoutingMode.MANUAL_MODEL) {
      return this.handleManualMode(input, classification, policyId);
    }

    const { items } = await this.registryRepo.list({ skip: 0, take: 200 });
    const eligible = applyRouteOnlyContract(items);

    if (eligible.length === 0) {
      return this.buildNoExecutionModelDecision(classification, mode, policyId, {
        code: 'NO_HEALTHY_EXECUTION_MODEL',
        explanation: 'No execution-capable, non-router-only, active model exists in the registry.',
        suggestedAction:
          'Sync the registry from connector/ollama/llamacpp services or install at least one model.',
      });
    }

    const candidates = await this.toScoringCandidates(eligible, classification.domain);

    const weights = await this.resolveWeights(mode, input.policyId);
    const scoring: ScoringInput = {
      classification: {
        domain: classification.domain,
        secondaryDomain: classification.secondaryDomain,
        modalityIn: classification.modalityIn,
        modalityOut: classification.modalityOut,
        riskLevel: classification.riskLevel,
        privacyClass: classification.privacyClass,
        confidence: classification.confidence,
      },
      policy: { policyId, weights },
      candidates,
    };
    const scored = this.scorer.score(scoring);

    if (scored.ranked.length === 0) {
      return this.buildNoExecutionModelDecision(classification, mode, policyId, {
        code: 'NO_PRIVACY_COMPLIANT_MODEL',
        explanation:
          'All candidate models were rejected by hard filters (router-only, privacy mismatch, or circuit open).',
        suggestedAction: 'Relax privacy class, reset open circuits, or install a local model.',
      });
    }

    const [winner] = scored.ranked;
    if (winner === undefined) {
      throw new Error('scored.ranked unexpectedly empty after non-empty check');
    }
    const winnerProfile = eligible.find((p) => p.id === winner.profileId);
    if (winnerProfile === undefined) {
      throw new Error(`Winner profileId=${winner.profileId} not in eligible set; this is a bug`);
    }
    const decision = this.buildSuccessDecision(
      winner,
      winnerProfile,
      scored.ranked,
      eligible,
      classification,
      mode,
      policyId,
      input.debug === true,
    );
    return this.validate(decision);
  }

  private buildFallbackChain(
    rankedTail: ReturnType<ScoringEngineManager['score']>['ranked'],
    eligible: RouterModelRegistryRecord[],
  ): RoutingDecisionV2['fallbackChain'] {
    return rankedTail.slice(1, 4).map((s) => {
      const profile = eligible.find((p) => p.id === s.profileId);
      return {
        profileId: s.profileId,
        provider: profile?.provider ?? 'UNKNOWN',
        modelKey: profile?.modelKey ?? 'UNKNOWN',
        reason: `score=${s.totalScore.toFixed(3)}`,
      };
    });
  }

  private buildSuccessDecision(
    winner: ReturnType<ScoringEngineManager['score']>['ranked'][number],
    winnerProfile: RouterModelRegistryRecord,
    ranked: ReturnType<ScoringEngineManager['score']>['ranked'],
    eligible: RouterModelRegistryRecord[],
    classification: ReturnType<ClassifierManager['classify']>,
    mode: RoutingMode,
    policyId: string,
    debug: boolean,
  ): RoutingDecisionV2 {
    return {
      decisionId: randomUUID(),
      selectedProfileId: winnerProfile.id,
      selectedProvider: winnerProfile.provider,
      selectedModel: winnerProfile.modelKey,
      runtimeType: runtimeTypeOf(winnerProfile),
      routingMode: mode,
      confidence: Number(Math.min(winner.totalScore, classification.confidence).toFixed(3)),
      classification: this.classificationToV2(classification),
      reasonTags: [
        ...classification.reasonTags,
        `winner_score=${winner.totalScore.toFixed(3)}`,
        `winning_dims=${winner.winningDimensions.join(',')}`,
      ],
      scoreBreakdown: debug ? winner.breakdown : null,
      candidates: debug
        ? ranked.slice(0, 5).map((s) => ({ profileId: s.profileId, totalScore: s.totalScore }))
        : null,
      costClass: winnerProfile.costClass,
      latencyClass: winnerProfile.latencyClass,
      fallbackChain: this.buildFallbackChain(ranked, eligible),
      policyApplied: { policyId, mode },
      noExecutionModelIssue: null,
    };
  }

  private classificationToV2(
    c: ReturnType<ClassifierManager['classify']>,
  ): RoutingDecisionV2['classification'] {
    return {
      domain: c.domain,
      secondaryDomain: c.secondaryDomain,
      taskFamily: c.taskFamily,
      modalityIn: c.modalityIn,
      modalityOut: c.modalityOut,
      riskLevel: c.riskLevel,
      privacyClass: c.privacyClass,
      confidence: c.confidence,
    };
  }

  private async resolveWeights(
    mode: RoutingMode,
    policyId: string | undefined,
  ): Promise<ReturnType<typeof resolvePolicyWeights>> {
    if (policyId === undefined || this.policiesRepo === undefined) {
      return resolvePolicyWeights(mode, null);
    }
    try {
      const policy = await this.policiesRepo.findById(policyId);
      const config = policy?.config as Record<string, unknown> | null | undefined;
      return resolvePolicyWeights(mode, config ?? null);
    } catch (error) {
      this.logger.warn(
        `resolveWeights(policyId=${policyId}) failed (${(error as Error).message}); using defaults`,
      );
      return resolvePolicyWeights(mode, null);
    }
  }

  private async handleManualMode(
    input: EvaluateInputV2,
    classification: ReturnType<ClassifierManager['classify']>,
    policyId: string,
  ): Promise<RoutingDecisionV2> {
    if (input.forcedProvider === undefined || input.forcedModel === undefined) {
      return this.buildNoExecutionModelDecision(
        classification,
        RoutingMode.MANUAL_MODEL,
        policyId,
        {
          code: 'MANUAL_SELECTION_INVALID',
          explanation: 'MANUAL_MODEL routing requires forcedProvider and forcedModel.',
          suggestedAction: 'Set forcedProvider and forcedModel in the evaluate request.',
        },
      );
    }
    const profile = await this.registryRepo.findByProviderAndModelKey(
      input.forcedProvider,
      input.forcedModel,
    );
    if (profile === null || profile.isRouterOnly || !profile.isExecutionCapable) {
      return this.buildNoExecutionModelDecision(
        classification,
        RoutingMode.MANUAL_MODEL,
        policyId,
        {
          code: 'MANUAL_SELECTION_INVALID',
          explanation: `Provider/model ${input.forcedProvider}/${input.forcedModel} is not a valid execution candidate.`,
          suggestedAction: 'Check spelling, lifecycle, and isRouterOnly flag.',
        },
      );
    }
    const cb = await this.circuit.getState(profile.provider);
    if (!cb.isAvailable) {
      return this.buildNoExecutionModelDecision(
        classification,
        RoutingMode.MANUAL_MODEL,
        policyId,
        {
          code: 'NO_HEALTHY_EXECUTION_MODEL',
          explanation: `Provider ${profile.provider} circuit breaker is OPEN.`,
          suggestedAction: 'Reset the circuit breaker or pick another provider.',
        },
      );
    }
    const decision: RoutingDecisionV2 = {
      decisionId: randomUUID(),
      selectedProfileId: profile.id,
      selectedProvider: profile.provider,
      selectedModel: profile.modelKey,
      runtimeType: runtimeTypeOf(profile),
      routingMode: RoutingMode.MANUAL_MODEL,
      confidence: 1,
      classification: {
        domain: classification.domain,
        secondaryDomain: classification.secondaryDomain,
        taskFamily: classification.taskFamily,
        modalityIn: classification.modalityIn,
        modalityOut: classification.modalityOut,
        riskLevel: classification.riskLevel,
        privacyClass: classification.privacyClass,
        confidence: classification.confidence,
      },
      reasonTags: ['manual_selection', ...classification.reasonTags],
      scoreBreakdown: null,
      candidates: null,
      costClass: profile.costClass,
      latencyClass: profile.latencyClass,
      fallbackChain: [],
      policyApplied: { policyId, mode: RoutingMode.MANUAL_MODEL },
      noExecutionModelIssue: null,
    };
    return this.validate(decision);
  }

  private async toScoringCandidates(
    profiles: Awaited<ReturnType<RouterModelRegistryRepository['list']>>['items'],
    domain: DomainTag,
  ): Promise<ScoringCandidate[]> {
    const learningEnabled = this.isLearningLoopEnabled();
    const out: ScoringCandidate[] = [];
    for (const profile of profiles) {
      const cb = await this.circuit.getState(profile.provider);
      const learnedSuccessRate = learningEnabled
        ? await this.fetchLearnedScore(profile, domain)
        : null;
      out.push({
        profile,
        health: {
          isHealthy: cb.isAvailable,
          circuitOpen: !cb.isAvailable,
          successRateLast24h: null,
        },
        learnedSuccessRate,
        judgeTrust: null,
        fallbackReliability: null,
      });
    }
    return out;
  }

  // Phase 9 — defensive AppConfig read. Test harnesses that don't
  // bootstrap the env (smoke spec) get learningEnabled=false instead
  // of a thrown Zod validation error. In production, AppConfig is
  // validated at bootstrap so this never throws.
  private isLearningLoopEnabled(): boolean {
    if (this.learningLoop === undefined) {
      return false;
    }
    try {
      return AppConfig.get().ROUTING_LEARNING_LOOP_INTEGRATED_ENABLED;
    } catch {
      return false;
    }
  }

  // Phase 9 — pulls the rolling learned success rate from the learning
  // loop. Returns null on any failure (DB unreachable, repo throws) so
  // the scoring engine falls back to the neutral 0.6 default — never
  // poisons routing with a stale or partial score.
  private async fetchLearnedScore(
    profile: RouterModelRegistryRecord,
    domain: DomainTag,
  ): Promise<number | null> {
    if (this.learningLoop === undefined) {
      return null;
    }
    try {
      const profileKey = `${profile.provider}/${profile.modelKey}`;
      const score = await this.learningLoop.getRollingScore(profileKey, domain, 'default');
      return score;
    } catch (error) {
      this.logger.warn(
        `fetchLearnedScore: failed for ${profile.provider}/${profile.modelKey} — ${(error as Error).message}`,
      );
      return null;
    }
  }

  private buildNoExecutionModelDecision(
    classification: ReturnType<ClassifierManager['classify']>,
    mode: RoutingMode,
    policyId: string,
    issue: NoExecutionModelIssue,
  ): RoutingDecisionV2 {
    this.logger.warn(`buildNoExecutionModelDecision code=${issue.code}`);
    const decision: RoutingDecisionV2 = {
      decisionId: randomUUID(),
      selectedProfileId: null,
      selectedProvider: null,
      selectedModel: null,
      runtimeType: 'UNKNOWN',
      routingMode: mode,
      confidence: 0,
      classification: {
        domain: classification.domain,
        secondaryDomain: classification.secondaryDomain,
        taskFamily: classification.taskFamily,
        modalityIn: classification.modalityIn,
        modalityOut: classification.modalityOut,
        riskLevel: classification.riskLevel,
        privacyClass: classification.privacyClass,
        confidence: classification.confidence,
      },
      reasonTags: [...classification.reasonTags, `no_execution:${issue.code}`],
      scoreBreakdown: null,
      candidates: null,
      costClass: null,
      latencyClass: null,
      fallbackChain: [],
      policyApplied: { policyId, mode },
      noExecutionModelIssue: issue,
    };
    return this.validate(decision);
  }

  private validate(decision: RoutingDecisionV2): RoutingDecisionV2 {
    const parsed = routingDecisionV2Schema.safeParse(decision);
    if (!parsed.success) {
      this.logger.error(`RoutingDecisionV2 schema validation failed: ${parsed.error.message}`);
      throw new Error(`RoutingDecisionV2 schema validation failed: ${parsed.error.message}`);
    }
    // The schema validates shape + ranges; dimension keys come from our scoring
    // engine and are always valid ScoreDimension values. Return the original
    // typed object so downstream consumers keep the narrow union type.
    return decision;
  }
}
