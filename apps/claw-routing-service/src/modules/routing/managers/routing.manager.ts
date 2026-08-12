import { Injectable, Logger } from '@nestjs/common';
import { LocalModelRole } from '@claw/shared-types';
import { RoutingMode } from '../../../generated/prisma';
import { ComplexityClass } from '../../../common/enums/complexity-class.enum';
import { matchKeyword, recordGet } from '../../../common/utilities';
import { RoutingPoliciesRepository } from '../repositories/routing-policies.repository';
import { OllamaRouterManager } from './ollama-router.manager';
import { PromptBuilderManager } from './prompt-builder.manager';
import { ComplexityClassifierManager } from './complexity-classifier.manager';
import { CapabilityRouterManager } from './capability-router.manager';
import { ImageDetectionManager } from './image-detection.manager';
import { PROVIDER_INFERENCE_RULES } from '../constants/provider-inference.constants';
import type { ProviderInferenceRule } from '../types/provider-inference.types';
import type { ComplexityClassification } from '../types/complexity.types';
import type { ExplanationFactor, RoutingExplanation } from '../types/explanation.types';
import {
  BUSINESS_KEYWORDS,
  CATEGORY_LATENCY_SLA_MS,
  CLOUD_MODEL_CHEAP,
  CLOUD_MODEL_DEFAULT,
  CLOUD_MODEL_FAST,
  CLOUD_MODEL_GEMINI_DEFAULT,
  CLOUD_MODEL_GROK_DEFAULT,
  CLOUD_MODEL_OLLAMA_DEFAULT,
  CLOUD_MODEL_OLLAMA_SECONDARY,
  CLOUD_MODEL_REASONING,
  CLOUD_PROVIDER_ANTHROPIC,
  CLOUD_PROVIDER_GEMINI,
  CLOUD_PROVIDER_GROK,
  CLOUD_PROVIDER_OLLAMA,
  CLOUD_PROVIDER_OPENAI,
  CODING_KEYWORDS,
  CONFIDENCE_CATEGORY_KEYWORD,
  CONFIDENCE_HEURISTIC_FALLBACK,
  CONFIDENCE_PRIVACY_ENFORCED,
  CREATIVE_WRITING_KEYWORDS,
  CUSTOMER_SUPPORT_KEYWORDS,
  DATA_ANALYSIS_KEYWORDS,
  DESIGN_KEYWORDS,
  EDUCATION_KEYWORDS,
  ENGINEERING_KEYWORDS,
  EXECUTIVE_KEYWORDS,
  FILE_GENERATION_FORMAT_WORDS,
  FILE_GENERATION_KEYWORDS,
  FILE_GENERATION_PROVIDER,
  FILE_GENERATION_VERBS,
  FINANCE_KEYWORDS,
  GOVERNMENT_KEYWORDS,
  HOSPITALITY_KEYWORDS,
  HR_KEYWORDS,
  IMAGE_MODEL_DALLE3,
  IMAGE_MODEL_IMAGEN,
  IMAGE_MODEL_SD_LOCAL,
  IMAGE_PROVIDER_GEMINI,
  IMAGE_PROVIDER_LOCAL,
  IMAGE_PROVIDER_OPENAI,
  INFRASTRUCTURE_KEYWORDS,
  LEGAL_KEYWORDS,
  LOCAL_MODEL_DEFAULT,
  LOCAL_PROVIDER,
  LOGISTICS_KEYWORDS,
  MEDIA_KEYWORDS,
  MEDICAL_KEYWORDS,
  MULTI_INTENT_CONFIDENCE_DOUBLE,
  MULTI_INTENT_CONFIDENCE_MULTI,
  MULTI_INTENT_CONFIDENCE_SINGLE,
  MULTI_INTENT_PRIORITY,
  OPERATIONS_KEYWORDS,
  PRIVACY_KEYWORDS,
  PROVIDER_COST_PER_1M_TOKENS,
  REAL_ESTATE_KEYWORDS,
  REASONING_KEYWORDS,
  RESEARCH_KEYWORDS,
  SALES_KEYWORDS,
  SCIENCE_KEYWORDS,
  SECURITY_KEYWORDS,
  SUSTAINABILITY_KEYWORDS,
  THINKING_KEYWORDS,
  TRANSLATION_KEYWORDS,
  VIDEO_AUDIO_KEYWORDS,
} from '../constants/routing.constants';
import type { InstalledModelInfo } from '../types/installed-model.types';
import {
  type FallbackEntry,
  type HeuristicState,
  type ModeHandler,
  type MultiIntentResult,
  type RouterDecisionSnapshot,
  type RoutingContext,
  type RoutingDecisionResult,
  type RoutingPolicy,
} from '../types/routing.types';

@Injectable()
export class RoutingManager {
  private readonly logger = new Logger(RoutingManager.name);

  constructor(
    private readonly policiesRepository: RoutingPoliciesRepository,
    private readonly ollamaRouter: OllamaRouterManager,
    private readonly promptBuilder: PromptBuilderManager,
    private readonly complexityClassifier: ComplexityClassifierManager,
    private readonly capabilityRouter: CapabilityRouterManager,
    private readonly imageDetection: ImageDetectionManager,
  ) {}

  async evaluateRoute(context: RoutingContext): Promise<RoutingDecisionResult> {
    const start = Date.now();
    const complexity = this.complexityClassifier.classify(context.message);
    const enrichedContext = { ...context, complexity };

    const result = await this.doEvaluate(enrichedContext);

    return {
      ...result,
      complexityClass: complexity.class,
      explanation: this.buildExplanation(result, complexity),
      routingDurationMs: Date.now() - start,
    };
  }

  private async doEvaluate(context: RoutingContext): Promise<RoutingDecisionResult> {
    this.logger.log(
      `doEvaluate: starting for thread ${context.threadId ?? 'none'}, userMode=${context.userMode ?? 'AUTO'}, complexity=${context.complexity?.class ?? 'unknown'}`,
    );
    const mode = await this.resolveRoutingMode(context);
    return this.dispatchByMode(mode, context);
  }

  private async resolveRoutingMode(context: RoutingContext): Promise<RoutingMode> {
    const explicitUserMode =
      context.userMode !== undefined &&
      context.userMode !== null &&
      context.userMode !== RoutingMode.AUTO;
    const policies = explicitUserMode ? [] : await this.policiesRepository.findActivePolicies();
    const policyOverride = explicitUserMode ? null : this.applyPolicies(policies, context);
    const mode = policyOverride ?? context.userMode ?? RoutingMode.AUTO;
    this.logger.debug(
      `doEvaluate: resolved mode=${mode} (policyOverride=${policyOverride ?? 'none'})`,
    );
    return mode;
  }

  private dispatchByMode(
    mode: RoutingMode,
    context: RoutingContext,
  ): Promise<RoutingDecisionResult> | RoutingDecisionResult {
    const handler = this.modeHandlers.get(mode);
    return handler ? handler(context) : this.handleAuto(context);
  }

  private get modeHandlers(): ReadonlyMap<RoutingMode, ModeHandler> {
    const handlers = new Map<RoutingMode, ModeHandler>();
    handlers.set(RoutingMode.MANUAL_MODEL, (ctx) => this.handleManualModel(ctx));
    handlers.set(RoutingMode.LOCAL_ONLY, (ctx) => this.handleLocalOnly(ctx));
    handlers.set(RoutingMode.PRIVACY_FIRST, (ctx) => this.handlePrivacyFirst(ctx));
    handlers.set(RoutingMode.LOW_LATENCY, (ctx) => this.handleLowLatency(ctx));
    handlers.set(RoutingMode.HIGH_REASONING, (ctx) => this.handleHighReasoning(ctx));
    handlers.set(RoutingMode.COST_SAVER, (ctx) => this.handleCostSaver(ctx));
    handlers.set(RoutingMode.AUTO, (ctx) => this.handleAuto(ctx));
    return handlers;
  }

  buildFallbackChain(
    primary: FallbackEntry,
    context: RoutingContext,
    sortByCost?: boolean,
  ): FallbackEntry[] {
    this.logger.debug(
      `buildFallbackChain: building for primary=${primary.provider}/${primary.model}`,
    );

    if (primary.provider === FILE_GENERATION_PROVIDER) {
      this.logger.debug('buildFallbackChain: file-generation primary - no cross-class fallback');
      return [];
    }

    if (primary.provider.startsWith('IMAGE_')) {
      const imageChain = this.buildImageFallbackChain(primary, context);
      this.logger.debug(
        `buildFallbackChain: image primary - chain length=${String(imageChain.length)}`,
      );
      return imageChain;
    }

    const isLocalPrimary = primary.provider === LOCAL_PROVIDER;
    const cloudFallbacks: FallbackEntry[] = [];
    const localFallbacks: FallbackEntry[] = [];

    const allCloudProviders: FallbackEntry[] = [
      { provider: CLOUD_PROVIDER_ANTHROPIC, model: CLOUD_MODEL_DEFAULT },
      { provider: CLOUD_PROVIDER_OPENAI, model: CLOUD_MODEL_FAST },
      { provider: CLOUD_PROVIDER_GEMINI, model: CLOUD_MODEL_GEMINI_DEFAULT },
      { provider: CLOUD_PROVIDER_GROK, model: CLOUD_MODEL_GROK_DEFAULT },
      // Ollama Cloud was absent here, so a run whose only healthy provider was
      // Ollama ended as "no reachable execution model". A quota-exhausted
      // OpenAI and a credit-depleted Gemini could take the whole request down
      // while nineteen usable Ollama models were reachable.
      { provider: CLOUD_PROVIDER_OLLAMA, model: CLOUD_MODEL_OLLAMA_DEFAULT },
      { provider: CLOUD_PROVIDER_OLLAMA, model: CLOUD_MODEL_OLLAMA_SECONDARY },
    ];

    if (isLocalPrimary) {
      this.logger.debug('buildFallbackChain: primary is local — adding healthy cloud fallbacks');
      // Fallback from local to any healthy cloud connector
      for (const cloud of allCloudProviders) {
        if (this.isConnectorHealthy(cloud.provider, context)) {
          this.logger.debug(
            `buildFallbackChain: adding cloud fallback ${cloud.provider}/${cloud.model}`,
          );
          cloudFallbacks.push(cloud);
        }
      }
    } else {
      // Fallback from cloud: try other cloud connectors first, then local models.
      this.logger.debug('buildFallbackChain: primary is cloud — checking local + other clouds');
      if (this.isRuntimeHealthy('OLLAMA', context)) {
        this.logger.debug('buildFallbackChain: adding local fallback');
        localFallbacks.push({ provider: LOCAL_PROVIDER, model: LOCAL_MODEL_DEFAULT });
      }
      for (const cloud of allCloudProviders) {
        if (
          cloud.provider !== primary.provider &&
          this.isConnectorHealthy(cloud.provider, context)
        ) {
          this.logger.debug(
            `buildFallbackChain: adding cloud fallback ${cloud.provider}/${cloud.model}`,
          );
          cloudFallbacks.push(cloud);
        }
      }
    }

    // Sort by cost (cheapest first) when in cost-saving mode
    if (sortByCost) {
      cloudFallbacks.sort(
        (a, b) => this.estimateProviderCost(a.provider) - this.estimateProviderCost(b.provider),
      );
      this.logger.debug('buildFallbackChain: sorted fallbacks by cost (cheapest first)');
    }

    // Confirmed-healthy providers go ahead of merely-attemptable ones, so the
    // optimistic path costs at most one wasted attempt at the tail of the
    // chain rather than delaying every request.
    cloudFallbacks.sort((a, b) => {
      const confirmed =
        Number(this.isConnectorConfirmedHealthy(b.provider, context)) -
        Number(this.isConnectorConfirmedHealthy(a.provider, context));
      if (confirmed !== 0) return confirmed;
      return (
        this.getLatencyPenalty(a.provider, context) - this.getLatencyPenalty(b.provider, context)
      );
    });

    const chain = [...cloudFallbacks, ...localFallbacks];
    this.logger.debug(`buildFallbackChain: chain built with ${String(chain.length)} entries`);
    return chain;
  }

  private async handleManualModel(context: RoutingContext): Promise<RoutingDecisionResult> {
    // MANUAL_MODEL means "the user chose this exact provider+model". If the
    // caller forgot to populate either, do NOT silently substitute a hardcoded
    // cloud default (`claude-sonnet-4`) — that surfaced as "Connector
    // 'ANTHROPIC' not found" for users without an Anthropic connector
    // configured. Fall through to AUTO so the router actually picks something
    // appropriate for the message + connector availability.
    if (!context.forcedModel) {
      this.logger.warn(
        `handleManualModel: MANUAL_MODEL with no forcedModel — falling through to AUTO (forcedProvider=${context.forcedProvider ?? 'none'})`,
      );
      return this.handleAuto(context);
    }
    const model = context.forcedModel;
    const provider = context.forcedProvider ?? this.inferProvider(model);
    this.logger.debug(`handleManualModel: forced provider=${provider} model=${model}`);
    const primary = { provider, model };
    const fallback = this.buildFallbackChain(primary, context);
    this.logger.debug(`handleManualModel: fallback chain length=${String(fallback.length)}`);

    return {
      selectedProvider: provider,
      selectedModel: model,
      routingMode: RoutingMode.MANUAL_MODEL,
      confidence: 1.0,
      reasonTags: ['user_forced'],
      privacyClass: 'unknown',
      costClass: 'unknown',
      fallbackChain: fallback,
    };
  }

  private async handleLocalOnly(context: RoutingContext): Promise<RoutingDecisionResult> {
    this.logger.debug('handleLocalOnly: selecting local provider only');
    const selectedModel = (await this.selectCategoryModel(context.message)) ?? LOCAL_MODEL_DEFAULT;
    const primary = { provider: LOCAL_PROVIDER, model: selectedModel };
    const fallback = this.buildFallbackChain(primary, context).filter(
      (f) => f.provider === LOCAL_PROVIDER,
    );
    this.logger.debug(
      `handleLocalOnly: model=${selectedModel} fallback chain length=${String(fallback.length)}`,
    );

    return {
      selectedProvider: LOCAL_PROVIDER,
      selectedModel,
      routingMode: RoutingMode.LOCAL_ONLY,
      confidence: 0.8,
      reasonTags: [
        'local_only',
        'privacy_max',
        selectedModel !== LOCAL_MODEL_DEFAULT ? 'category_specific' : 'default_model',
      ],
      privacyClass: 'local',
      costClass: 'free',
      fallbackChain: fallback,
    };
  }

  private handlePrivacyFirst(context: RoutingContext): RoutingDecisionResult {
    const localHealthy = this.isRuntimeHealthy('OLLAMA', context);
    this.logger.debug(`handlePrivacyFirst: localHealthy=${String(localHealthy)}`);

    if (localHealthy) {
      this.logger.debug('handlePrivacyFirst: using local provider (privacy preferred)');
      const primary = { provider: LOCAL_PROVIDER, model: LOCAL_MODEL_DEFAULT };
      return {
        selectedProvider: LOCAL_PROVIDER,
        selectedModel: LOCAL_MODEL_DEFAULT,
        routingMode: RoutingMode.PRIVACY_FIRST,
        confidence: 0.85,
        reasonTags: ['privacy_first', 'local_preferred'],
        privacyClass: 'local',
        costClass: 'free',
        // A privacy-first request must never egress. This chain was returned
        // unfiltered while handleLocalOnly filtered its own, so a local model
        // that simply failed to load would hand the prompt to whatever cloud
        // provider came next. The execution side does not filter either: it
        // logs "never add cloud providers for privacy-sensitive routing modes"
        // and then returns the chain unchanged. Filter it here, at the source,
        // exactly as handleLocalOnly does.
        fallbackChain: this.buildFallbackChain(primary, context).filter(
          (entry) => entry.provider === LOCAL_PROVIDER,
        ),
      };
    }

    this.logger.debug('handlePrivacyFirst: local unavailable — falling back to Anthropic');
    const primary = { provider: CLOUD_PROVIDER_ANTHROPIC, model: CLOUD_MODEL_DEFAULT };
    return {
      selectedProvider: CLOUD_PROVIDER_ANTHROPIC,
      selectedModel: CLOUD_MODEL_DEFAULT,
      routingMode: RoutingMode.PRIVACY_FIRST,
      confidence: 0.6,
      reasonTags: ['privacy_first', 'local_unavailable', 'cloud_fallback'],
      privacyClass: 'cloud',
      costClass: 'medium',
      fallbackChain: this.buildFallbackChain(primary, context),
    };
  }

  private handleLowLatency(context: RoutingContext): RoutingDecisionResult {
    const primary = { provider: CLOUD_PROVIDER_OPENAI, model: CLOUD_MODEL_FAST };
    return {
      selectedProvider: CLOUD_PROVIDER_OPENAI,
      selectedModel: CLOUD_MODEL_FAST,
      routingMode: RoutingMode.LOW_LATENCY,
      confidence: 0.9,
      reasonTags: ['low_latency', 'fastest_model'],
      privacyClass: 'cloud',
      costClass: 'low',
      fallbackChain: this.buildFallbackChain(primary, context),
    };
  }

  private handleHighReasoning(context: RoutingContext): RoutingDecisionResult {
    const primary = { provider: CLOUD_PROVIDER_ANTHROPIC, model: CLOUD_MODEL_REASONING };
    return {
      selectedProvider: CLOUD_PROVIDER_ANTHROPIC,
      selectedModel: CLOUD_MODEL_REASONING,
      routingMode: RoutingMode.HIGH_REASONING,
      confidence: 0.95,
      reasonTags: ['high_reasoning', 'strongest_model'],
      privacyClass: 'cloud',
      costClass: 'high',
      fallbackChain: this.buildFallbackChain(primary, context),
    };
  }

  private handleCostSaver(context: RoutingContext): RoutingDecisionResult {
    const localHealthy = this.isRuntimeHealthy('OLLAMA', context);
    this.logger.debug(`handleCostSaver: localHealthy=${String(localHealthy)}`);

    if (localHealthy) {
      this.logger.debug('handleCostSaver: using free local provider');
      const primary = { provider: LOCAL_PROVIDER, model: LOCAL_MODEL_DEFAULT };
      return {
        selectedProvider: LOCAL_PROVIDER,
        selectedModel: LOCAL_MODEL_DEFAULT,
        routingMode: RoutingMode.COST_SAVER,
        confidence: 0.85,
        reasonTags: ['cost_saver', 'free_local'],
        privacyClass: 'local',
        costClass: 'free',
        fallbackChain: this.buildFallbackChain(primary, context, true),
        estimatedCostPer1M: 0,
      };
    }

    this.logger.debug('handleCostSaver: local unavailable — using cheapest cloud');
    const primary = { provider: CLOUD_PROVIDER_OPENAI, model: CLOUD_MODEL_CHEAP };
    return {
      selectedProvider: CLOUD_PROVIDER_OPENAI,
      selectedModel: CLOUD_MODEL_CHEAP,
      routingMode: RoutingMode.COST_SAVER,
      confidence: 0.8,
      reasonTags: ['cost_saver', 'cheapest_cloud'],
      privacyClass: 'cloud',
      costClass: 'low',
      fallbackChain: this.buildFallbackChain(primary, context, true),
      estimatedCostPer1M: this.estimateProviderCost(CLOUD_PROVIDER_OPENAI),
    };
  }

  private async handleAuto(context: RoutingContext): Promise<RoutingDecisionResult> {
    this.logger.debug('handleAuto: starting AUTO routing');
    const localEnforcementDomain = this.detectLocalEnforcementDomain(context.message);

    this.logSensitiveContentDetections(context.message);

    if (!localEnforcementDomain) {
      const earlyContent = this.tryImageOrFileGeneration(context);
      if (earlyContent) {
        return earlyContent;
      }
      const capabilityResult = this.tryCapabilityRouting(context);
      if (capabilityResult) {
        return capabilityResult;
      }
    }

    const ollamaResult = await this.tryOllamaAssistedRouting(context, localEnforcementDomain);
    if (ollamaResult) {
      return ollamaResult;
    }

    if (localEnforcementDomain) {
      this.logger.log(
        `handleAuto: Ollama router unavailable - forcing local for ${localEnforcementDomain}`,
      );
      return this.buildLocalPrivacyDecision(context, localEnforcementDomain);
    }

    const categoryResult = await this.detectCategoryRoute(context);
    if (categoryResult) {
      this.logger.log('handleAuto: category-specific local model matched');
      return categoryResult;
    }

    this.logger.debug('handleAuto: Ollama router unavailable, using heuristic fallback');
    return this.handleAutoHeuristic(context);
  }

  private logSensitiveContentDetections(message: string): void {
    const detections: Array<[boolean, string]> = [
      [this.detectPrivacySensitive(message), 'privacy-sensitive content'],
      [this.detectMedicalRequest(message), 'medical content'],
      [this.detectLegalRequest(message), 'legal content'],
      [this.detectFinanceRequest(message), 'financial content'],
      [this.detectExecutiveRequest(message), 'executive content'],
      [this.detectGovernmentRequest(message), 'government/intelligence content'],
    ];
    for (const [matched, label] of detections) {
      if (matched) {
        this.logger.log(`handleAuto: ${label} detected — forcing local routing`);
      }
    }
  }

  private tryImageOrFileGeneration(context: RoutingContext): RoutingDecisionResult | null {
    this.logger.debug('handleAuto: checking for image generation request');
    const imageResult = this.detectImageRequest(context);
    if (imageResult) {
      this.logger.log('handleAuto: image generation request detected — routing to image provider');
      return imageResult;
    }
    this.logger.debug('handleAuto: checking for file generation request');
    const fileResult = this.detectFileGenerationRequest(context);
    if (fileResult) {
      this.logger.log(
        'handleAuto: file generation request detected — routing to file-gen provider',
      );
      return fileResult;
    }
    return null;
  }

  private tryCapabilityRouting(context: RoutingContext): RoutingDecisionResult | null {
    const capabilityResult = this.capabilityRouter.route(context);
    if (!capabilityResult) {
      return null;
    }
    this.logger.log(
      `handleAuto: capability routing → ${capabilityResult.provider}/${capabilityResult.model} (${capabilityResult.capability})`,
    );
    const primary = { provider: capabilityResult.provider, model: capabilityResult.model };
    return {
      selectedProvider: capabilityResult.provider,
      selectedModel: capabilityResult.model,
      routingMode: RoutingMode.AUTO,
      confidence: 0.88,
      reasonTags: ['auto', 'multimodal', capabilityResult.reason],
      privacyClass: 'cloud',
      costClass: 'medium',
      detectedCategory: capabilityResult.capability.toLowerCase(),
      fallbackChain: this.buildFallbackChain(primary, context),
    };
  }

  private async tryOllamaAssistedRouting(
    context: RoutingContext,
    localEnforcementDomain: string | null,
  ): Promise<RoutingDecisionResult | null> {
    this.logger.debug('handleAuto: attempting Ollama-assisted routing');
    const ollamaDecision = await this.ollamaRouter.route(context);
    if (!ollamaDecision) {
      return null;
    }
    this.logger.log(
      `handleAuto: Ollama router decided ${ollamaDecision.provider}/${ollamaDecision.model} (confidence=${String(ollamaDecision.confidence)})`,
    );
    if (this.shouldRejectRouterSelection(context.message, ollamaDecision)) {
      this.logger.warn(
        `handleAuto: rejecting semantically invalid Ollama route ${ollamaDecision.provider}/${ollamaDecision.model} for message="${context.message.slice(0, 80)}"`,
      );
      return null;
    }
    const enforcedLocal = Boolean(localEnforcementDomain);
    const selectedProvider = enforcedLocal ? LOCAL_PROVIDER : ollamaDecision.provider;
    const selectedModel = enforcedLocal ? LOCAL_MODEL_DEFAULT : ollamaDecision.model;
    const primary = { provider: selectedProvider, model: selectedModel };
    const reasonTags = ['auto', 'ollama_router', ollamaDecision.reason];
    if (enforcedLocal && localEnforcementDomain) {
      reasonTags.push('privacy_enforced', 'local_only', localEnforcementDomain);
    }
    return {
      selectedProvider,
      selectedModel,
      routingMode: RoutingMode.AUTO,
      confidence: ollamaDecision.confidence,
      reasonTags,
      privacyClass: selectedProvider === LOCAL_PROVIDER ? 'local' : 'cloud',
      costClass: selectedProvider === LOCAL_PROVIDER ? 'free' : 'medium',
      detectedCategory: localEnforcementDomain?.replace('domain_', ''),
      fallbackChain: this.buildFallbackChain(primary, context),
      routerModel: ollamaDecision.routerModel,
    };
  }

  private detectLocalEnforcementDomain(message: string): string | null {
    if (this.detectPrivacySensitive(message)) {
      return 'domain_privacy';
    }
    if (this.detectMedicalRequest(message)) {
      return 'domain_medical';
    }
    if (this.detectLegalRequest(message)) {
      return 'domain_legal';
    }
    if (this.detectFinanceRequest(message)) {
      return 'domain_finance';
    }
    if (this.detectExecutiveRequest(message)) {
      return 'domain_executive';
    }
    if (this.detectGovernmentRequest(message)) {
      return 'domain_government';
    }
    return null;
  }

  private async handleAutoHeuristic(context: RoutingContext): Promise<RoutingDecisionResult> {
    this.logger.debug('handleAutoHeuristic: starting heuristic-based routing');

    const earlyContent = this.tryImageOrFileGeneration(context);
    if (earlyContent) {
      return earlyContent;
    }
    const capabilityResult = this.tryCapabilityRouting(context);
    if (capabilityResult) {
      return capabilityResult;
    }
    const categoryResult = await this.detectCategoryRoute(context);
    if (categoryResult) {
      this.logger.debug('handleAutoHeuristic: category-specific local model matched');
      return categoryResult;
    }

    const heuristicState = await this.computeHeuristicState(context);
    return this.applyHeuristicRules(context, heuristicState);
  }

  private async computeHeuristicState(context: RoutingContext): Promise<HeuristicState> {
    const localHealthy = this.isRuntimeHealthy('OLLAMA', context);
    const messageLength = context.message.length;
    const complexity = context.complexity;
    const canPreferGenericLocal = await this.canPreferGenericLocal(context);
    const localLatencyMs = recordGet(context.providerLatencyMs, LOCAL_PROVIDER) ?? null;
    this.logger.debug(
      `handleAutoHeuristic: localHealthy=${String(localHealthy)} messageLength=${String(messageLength)} complexity=${complexity?.class ?? 'unclassified'} canPreferGenericLocal=${String(canPreferGenericLocal)} localLatencyMs=${String(localLatencyMs ?? 'n/a')}`,
    );
    const cloudPriority: FallbackEntry[] = [
      { provider: CLOUD_PROVIDER_ANTHROPIC, model: CLOUD_MODEL_DEFAULT },
      { provider: CLOUD_PROVIDER_OPENAI, model: CLOUD_MODEL_FAST },
      { provider: CLOUD_PROVIDER_GEMINI, model: CLOUD_MODEL_GEMINI_DEFAULT },
    ];
    const bestAvailable = this.selectBestCloudCandidate(context, cloudPriority);
    const localLikelySlow =
      localLatencyMs !== null &&
      localLatencyMs >= (context.localDegradeLatencyMs ?? 18_000) &&
      bestAvailable !== null;
    return {
      localHealthy,
      messageLength,
      complexity,
      canPreferGenericLocal,
      cloudPriority,
      bestAvailable,
      localLikelySlow,
    };
  }

  private applyHeuristicRules(
    context: RoutingContext,
    state: HeuristicState,
  ): RoutingDecisionResult {
    const expertResult = this.tryExpertComplexityRoute(context, state);
    if (expertResult) {
      return expertResult;
    }
    const localResult = this.tryLocalPreferredRoute(context, state);
    if (localResult) {
      return localResult;
    }
    const cloudResult = this.tryCloudRoute(context, state);
    if (cloudResult) {
      return cloudResult;
    }
    return this.buildNoReachableModelDecision();
  }

  private tryExpertComplexityRoute(
    context: RoutingContext,
    state: HeuristicState,
  ): RoutingDecisionResult | null {
    if (
      state.complexity?.class !== ComplexityClass.EXPERT ||
      !this.isConnectorHealthy(CLOUD_PROVIDER_ANTHROPIC, context)
    ) {
      return null;
    }
    this.logger.log('handleAutoHeuristic: EXPERT complexity — routing to high-reasoning cloud');
    const primary = { provider: CLOUD_PROVIDER_ANTHROPIC, model: CLOUD_MODEL_REASONING };
    return {
      selectedProvider: CLOUD_PROVIDER_ANTHROPIC,
      selectedModel: CLOUD_MODEL_REASONING,
      routingMode: RoutingMode.AUTO,
      confidence: 0.82,
      reasonTags: ['auto', 'expert_complexity', 'high_reasoning_cloud'],
      privacyClass: 'cloud',
      costClass: 'high',
      fallbackChain: this.buildFallbackChain(primary, context),
      estimatedCostPer1M: this.estimateProviderCost(CLOUD_PROVIDER_ANTHROPIC),
    };
  }

  private tryLocalPreferredRoute(
    context: RoutingContext,
    state: HeuristicState,
  ): RoutingDecisionResult | null {
    if (!state.localHealthy || !state.canPreferGenericLocal || state.localLikelySlow) {
      return null;
    }
    const isSimple = state.complexity?.class === ComplexityClass.SIMPLE;
    const isShort = state.messageLength < 500;
    if (!isSimple && !isShort) {
      return null;
    }
    if (isSimple) {
      this.logger.log('handleAutoHeuristic: SIMPLE complexity + local available — routing local');
    } else {
      this.logger.debug('handleAutoHeuristic: short message + local available — using local');
    }
    const primary = { provider: LOCAL_PROVIDER, model: LOCAL_MODEL_DEFAULT };
    const reasonTags = isSimple
      ? ['auto', 'simple_complexity', 'local_preferred']
      : ['auto', 'short_message', 'local_available'];
    return {
      selectedProvider: LOCAL_PROVIDER,
      selectedModel: LOCAL_MODEL_DEFAULT,
      routingMode: RoutingMode.AUTO,
      confidence: CONFIDENCE_HEURISTIC_FALLBACK,
      reasonTags,
      privacyClass: 'local',
      costClass: 'free',
      fallbackChain: this.buildFallbackChain(primary, context),
      estimatedCostPer1M: 0,
    };
  }

  private tryCloudRoute(
    context: RoutingContext,
    state: HeuristicState,
  ): RoutingDecisionResult | null {
    if (state.bestAvailable) {
      this.logger.debug(
        `handleAutoHeuristic: best available cloud=${state.bestAvailable.provider}/${state.bestAvailable.model}`,
      );
      return {
        selectedProvider: state.bestAvailable.provider,
        selectedModel: state.bestAvailable.model,
        routingMode: RoutingMode.AUTO,
        confidence: state.localLikelySlow ? 0.8 : 0.75,
        reasonTags: [
          'auto',
          'cloud_preferred',
          'connector_available',
          ...(state.localLikelySlow ? ['latency_aware', 'local_slow'] : ['latency_aware']),
        ],
        privacyClass: 'cloud',
        costClass: 'medium',
        fallbackChain: this.buildFallbackChain(state.bestAvailable, context),
      };
    }
    return null;
  }

  private buildNoReachableModelDecision(): RoutingDecisionResult {
    this.logger.warn('handleAutoHeuristic: no reachable execution model');
    return {
      selectedProvider: 'UNAVAILABLE',
      selectedModel: 'NONE',
      routingMode: RoutingMode.AUTO,
      confidence: 0,
      reasonTags: ['auto', 'no_reachable_execution_model'],
      privacyClass: 'unknown',
      costClass: 'unknown',
      fallbackChain: [],
    };
  }

  private inferProvider(model: string): string {
    this.logger.debug(`inferProvider: inferring provider for model="${model}"`);
    const lower = model.toLowerCase().replace(/^models\//, '');

    for (const rule of PROVIDER_INFERENCE_RULES) {
      if (this.matchesProviderRule(lower, rule)) {
        return rule.provider;
      }
    }
    return CLOUD_PROVIDER_ANTHROPIC;
  }

  private matchesProviderRule(lower: string, rule: ProviderInferenceRule): boolean {
    if (rule.startsWith?.some((p) => lower.startsWith(p))) {
      return true;
    }
    return rule.includes?.some((p) => lower.includes(p)) ?? false;
  }

  private detectImageRequest(context: RoutingContext): RoutingDecisionResult | null {
    const detection = this.imageDetection.detect(context.message);
    if (!detection.matched) {
      return null;
    }
    this.logger.log('detectImageRequest: image generation request detected via keyword heuristic');
    return this.buildImageDecisionForBestProvider(context);
  }

  private buildImageDecisionForBestProvider(context: RoutingContext): RoutingDecisionResult {
    if (this.isConnectorHealthy('GEMINI', context)) {
      return this.buildImageDecision(IMAGE_PROVIDER_GEMINI, IMAGE_MODEL_IMAGEN, context);
    }
    if (this.isConnectorHealthy('OPENAI', context)) {
      return this.buildImageDecision(IMAGE_PROVIDER_OPENAI, IMAGE_MODEL_DALLE3, context);
    }
    return this.buildImageDecision(IMAGE_PROVIDER_LOCAL, IMAGE_MODEL_SD_LOCAL, context);
  }

  private buildImageDecision(
    provider: string,
    model: string,
    context: RoutingContext,
  ): RoutingDecisionResult {
    const primary = { provider, model };
    return {
      selectedProvider: provider,
      selectedModel: model,
      routingMode: RoutingMode.AUTO,
      confidence: 0.95,
      reasonTags: ['auto', 'image_generation', 'keyword_detected'],
      privacyClass: provider === IMAGE_PROVIDER_LOCAL ? 'local' : 'cloud',
      costClass: provider === IMAGE_PROVIDER_LOCAL ? 'free' : 'medium',
      fallbackChain: this.buildFallbackChain(primary, context),
    };
  }

  private detectFileGenerationRequest(context: RoutingContext): RoutingDecisionResult | null {
    this.logger.debug('detectFileGenerationRequest: scanning message for file-gen keywords');
    const lower = context.message.toLowerCase();
    const hasConversationalResponseIntent = /\b(response|reply|answer|respond)\b/.test(lower);
    const hasStrongArtifactIntent =
      /\b(file|pdf|csv|docx|spreadsheet|slides|deck|memo|report|brief|checklist|printable|formatted|export|download|save as)\b/.test(
        lower,
      );

    if (hasConversationalResponseIntent && !hasStrongArtifactIntent) {
      this.logger.debug(
        'detectFileGenerationRequest: conversational response intent without explicit artifact - skipping file generation',
      );
      return null;
    }

    // Check exact phrase matches first
    const exactMatch = FILE_GENERATION_KEYWORDS.some((kw) => lower.includes(kw));

    // Then check verb + format word combo (handles "generate dummy pdf", "create text file", etc.)
    const hasVerb = FILE_GENERATION_VERBS.some((v) => lower.includes(v));
    const hasFormat = FILE_GENERATION_FORMAT_WORDS.some((f) => lower.includes(f));
    const comboMatch = hasVerb && hasFormat;

    this.logger.debug(
      `detectFileGenerationRequest: exactMatch=${String(exactMatch)} comboMatch=${String(comboMatch)} (hasVerb=${String(hasVerb)} hasFormat=${String(hasFormat)})`,
    );
    if (!exactMatch && !comboMatch) {
      this.logger.debug('detectFileGenerationRequest: no file generation request detected');
      return null;
    }

    this.logger.log(
      'detectFileGenerationRequest: file generation request detected via keyword heuristic',
    );

    const primary = { provider: FILE_GENERATION_PROVIDER, model: 'auto' };
    return {
      selectedProvider: FILE_GENERATION_PROVIDER,
      selectedModel: 'auto',
      routingMode: RoutingMode.AUTO,
      confidence: 0.95,
      reasonTags: ['auto', 'file_generation', 'keyword_detected'],
      privacyClass: 'cloud',
      costClass: 'medium',
      fallbackChain: this.buildFallbackChain(primary, context),
    };
  }

  detectCodingRequest(message: string): boolean {
    return matchKeyword(message, CODING_KEYWORDS);
  }

  detectReasoningRequest(message: string): boolean {
    return matchKeyword(message, REASONING_KEYWORDS);
  }

  detectThinkingRequest(message: string): boolean {
    return matchKeyword(message, THINKING_KEYWORDS);
  }

  detectInfrastructureRequest(message: string): boolean {
    return matchKeyword(message, INFRASTRUCTURE_KEYWORDS);
  }

  detectDataAnalysisRequest(message: string): boolean {
    return matchKeyword(message, DATA_ANALYSIS_KEYWORDS);
  }

  detectBusinessRequest(message: string): boolean {
    return matchKeyword(message, BUSINESS_KEYWORDS);
  }

  detectCreativeWritingRequest(message: string): boolean {
    return matchKeyword(message, CREATIVE_WRITING_KEYWORDS);
  }

  detectSecurityRequest(message: string): boolean {
    return matchKeyword(message, SECURITY_KEYWORDS);
  }

  detectMedicalRequest(message: string): boolean {
    return matchKeyword(message, MEDICAL_KEYWORDS);
  }

  detectLegalRequest(message: string): boolean {
    return matchKeyword(message, LEGAL_KEYWORDS);
  }

  detectTranslationRequest(message: string): boolean {
    return matchKeyword(message, TRANSLATION_KEYWORDS);
  }

  detectHRRequest(message: string): boolean {
    return matchKeyword(message, HR_KEYWORDS);
  }

  detectFinanceRequest(message: string): boolean {
    return matchKeyword(message, FINANCE_KEYWORDS);
  }

  detectOperationsRequest(message: string): boolean {
    return matchKeyword(message, OPERATIONS_KEYWORDS);
  }

  detectSalesRequest(message: string): boolean {
    return matchKeyword(message, SALES_KEYWORDS);
  }

  detectRealEstateRequest(message: string): boolean {
    return matchKeyword(message, REAL_ESTATE_KEYWORDS);
  }

  detectEducationRequest(message: string): boolean {
    return matchKeyword(message, EDUCATION_KEYWORDS);
  }

  detectCustomerSupportRequest(message: string): boolean {
    return matchKeyword(message, CUSTOMER_SUPPORT_KEYWORDS);
  }

  detectVideoAudioRequest(message: string): boolean {
    return matchKeyword(message, VIDEO_AUDIO_KEYWORDS);
  }

  detectDesignRequest(message: string): boolean {
    return matchKeyword(message, DESIGN_KEYWORDS);
  }

  detectResearchRequest(message: string): boolean {
    return matchKeyword(message, RESEARCH_KEYWORDS);
  }

  detectExecutiveRequest(message: string): boolean {
    return matchKeyword(message, EXECUTIVE_KEYWORDS);
  }

  detectEngineeringRequest(message: string): boolean {
    return matchKeyword(message, ENGINEERING_KEYWORDS);
  }

  detectScienceRequest(message: string): boolean {
    return matchKeyword(message, SCIENCE_KEYWORDS);
  }

  detectGovernmentRequest(message: string): boolean {
    return matchKeyword(message, GOVERNMENT_KEYWORDS);
  }

  detectLogisticsRequest(message: string): boolean {
    return matchKeyword(message, LOGISTICS_KEYWORDS);
  }

  detectHospitalityRequest(message: string): boolean {
    return matchKeyword(message, HOSPITALITY_KEYWORDS);
  }

  detectMediaRequest(message: string): boolean {
    return matchKeyword(message, MEDIA_KEYWORDS);
  }

  detectSustainabilityRequest(message: string): boolean {
    return matchKeyword(message, SUSTAINABILITY_KEYWORDS);
  }

  detectPrivacySensitive(message: string): boolean {
    return matchKeyword(message, PRIVACY_KEYWORDS);
  }

  private buildExplanation(
    result: RoutingDecisionResult,
    complexity: ComplexityClassification,
  ): RoutingExplanation {
    const factors: ExplanationFactor[] = [
      {
        factor: 'routing_mode',
        value: result.routingMode,
        weight: 'HIGH',
        description: `Routing mode: ${result.routingMode}`,
      },
      {
        factor: 'complexity',
        value: complexity.class,
        weight: 'HIGH',
        description: `Message complexity: ${complexity.class} (${complexity.wordCount} words${complexity.factors.length > 0 ? `, factors: ${complexity.factors.join(', ')}` : ''})`,
      },
      {
        factor: 'privacy',
        value: result.privacyClass,
        weight: 'HIGH',
        description:
          result.privacyClass === 'local'
            ? 'Privacy-sensitive content — routed locally'
            : 'No privacy constraints detected',
      },
      {
        factor: 'cost',
        value: result.costClass,
        weight: 'MEDIUM',
        description: `Cost class: ${result.costClass}${result.estimatedCostPer1M !== undefined ? ` (~$${result.estimatedCostPer1M.toFixed(2)}/1M tokens)` : ''}`,
      },
    ];

    if (result.detectedCategory) {
      factors.push({
        factor: 'category',
        value: result.detectedCategory,
        weight: 'MEDIUM',
        description: `Detected task category: ${result.detectedCategory}`,
      });
    }

    if (result.latencySlaMs !== undefined) {
      factors.push({
        factor: 'latency_sla',
        value: `${String(result.latencySlaMs)}ms`,
        weight: 'LOW',
        description: `Target latency SLA: ${String(result.latencySlaMs)}ms`,
      });
    }

    return {
      summary: `Routed to ${result.selectedProvider}/${result.selectedModel} via ${result.routingMode} mode`,
      factors,
      rejected: [],
    };
  }

  private buildLocalPrivacyDecision(
    context: RoutingContext,
    detectedDomain?: string,
  ): RoutingDecisionResult {
    const primary = { provider: LOCAL_PROVIDER, model: LOCAL_MODEL_DEFAULT };
    const reasonTags = ['auto', 'privacy_enforced', 'local_only'];
    if (detectedDomain) {
      reasonTags.push(detectedDomain);
    }
    this.logger.log(
      `buildLocalPrivacyDecision: routing to local (domain=${detectedDomain ?? 'generic'})`,
    );

    const category = detectedDomain?.replace('domain_', '') ?? 'general';
    const latencySlaMs =
      recordGet(CATEGORY_LATENCY_SLA_MS, category) ?? recordGet(CATEGORY_LATENCY_SLA_MS, 'general');

    return {
      selectedProvider: LOCAL_PROVIDER,
      selectedModel: LOCAL_MODEL_DEFAULT,
      routingMode: RoutingMode.AUTO,
      confidence: CONFIDENCE_PRIVACY_ENFORCED,
      reasonTags,
      privacyClass: 'local',
      costClass: 'free',
      fallbackChain: this.buildFallbackChain(primary, context).filter(
        (f) => f.provider === LOCAL_PROVIDER,
      ),
      detectedCategory: category,
      estimatedCostPer1M: 0,
      latencySlaMs,
    };
  }

  private async detectCategoryRoute(
    context: RoutingContext,
  ): Promise<RoutingDecisionResult | null> {
    // NOTE: previously this method early-returned when isRuntimeHealthy('OLLAMA')
    // was false. That gate is too strict: an Ollama-assisted *router* model
    // timeout flags the whole runtime unhealthy, even though the actual
    // coding / reasoning / etc. chat models on the same Ollama are fine.
    // The result was that the category-aware routing (coding → LOCAL_CODING,
    // medical → LOCAL_REASONING, etc.) was bypassed and we fell through to a
    // hardcoded cloud "best-effort" pick (ANTHROPIC/claude-sonnet-4) that
    // doesn't exist on installs without an Anthropic connector. We now still
    // attempt category routing; if the chosen role has no installed model
    // (findModelForRole returns null) the existing fall-through logic kicks
    // in and the heuristic path runs as before — preserving the cloud
    // best-effort path for installs that genuinely have no local models.
    const ollamaRuntimeHealthy = this.isRuntimeHealthy('OLLAMA', context);
    if (!ollamaRuntimeHealthy) {
      this.logger.warn(
        'detectCategoryRoute: Ollama runtime flagged unhealthy — still attempting category routing (chat models may be reachable even if router model timed out)',
      );
    }

    const multiIntent = this.resolveMultipleCategories(context.message);
    if (multiIntent.primary === 'general') {
      return null;
    }

    const role = this.mapCategoryToRole(multiIntent.primary);
    if (!role) {
      return null;
    }

    const latencySlaMs =
      CATEGORY_LATENCY_SLA_MS[multiIntent.primary] ?? CATEGORY_LATENCY_SLA_MS['general'];
    const reasonTags = this.buildCategoryReasonTags(multiIntent, role);

    const cloudCategoryDecision = this.buildCloudCategoryDecision(
      role,
      context,
      multiIntent,
      reasonTags,
    );
    if (cloudCategoryDecision !== null) {
      return cloudCategoryDecision;
    }

    const estimatedCostPer1M = this.estimateProviderCost(LOCAL_PROVIDER);

    const model = await this.findModelForRole(role);
    if (model) {
      this.logger.log(`detectCategoryRoute: role=${role} model=${model.name}:${model.tag}`);
      const decision = this.buildCategoryDecision(model, role, context);
      return {
        ...decision,
        reasonTags,
        detectedCategory: multiIntent.primary,
        secondaryCategory: multiIntent.secondary ?? undefined,
        matchCount: multiIntent.matchCount,
        estimatedCostPer1M,
        latencySlaMs,
      };
    }

    // No specialized model installed for this role — use default local model
    this.logger.log(`detectCategoryRoute: no model for role=${role}, using default local`);
    const primary = { provider: LOCAL_PROVIDER, model: LOCAL_MODEL_DEFAULT };
    return {
      selectedProvider: LOCAL_PROVIDER,
      selectedModel: LOCAL_MODEL_DEFAULT,
      routingMode: RoutingMode.AUTO,
      confidence: multiIntent.confidence,
      reasonTags,
      privacyClass: 'local',
      costClass: 'free',
      fallbackChain: this.buildFallbackChain(primary, context),
      detectedCategory: multiIntent.primary,
      secondaryCategory: multiIntent.secondary ?? undefined,
      matchCount: multiIntent.matchCount,
      estimatedCostPer1M,
      latencySlaMs,
    };
  }

  private buildCategoryReasonTags(multiIntent: MultiIntentResult, role: LocalModelRole): string[] {
    const tags = ['auto', 'category_detected', `role_${role.toLowerCase()}`];
    tags.push(`category_${multiIntent.primary}`);
    if (multiIntent.secondary) {
      tags.push(`secondary_${multiIntent.secondary}`);
    }
    if (multiIntent.matchCount > 1) {
      tags.push('multi_intent');
    }
    return tags;
  }

  private detectCategoryRole(message: string): LocalModelRole | null {
    const multiIntent = this.resolveMultipleCategories(message);

    if (multiIntent.primary === 'general') {
      return null;
    }

    return this.mapCategoryToRole(multiIntent.primary);
  }

  private mapCategoryToRole(category: string): LocalModelRole | null {
    const roleMap: Record<string, LocalModelRole> = {
      security: LocalModelRole.LOCAL_CODING,
      coding: LocalModelRole.LOCAL_CODING,
      infrastructure: LocalModelRole.LOCAL_CODING,
      medical: LocalModelRole.LOCAL_REASONING,
      legal: LocalModelRole.LOCAL_REASONING,
      finance: LocalModelRole.LOCAL_REASONING,
      real_estate: LocalModelRole.LOCAL_REASONING,
      executive: LocalModelRole.LOCAL_REASONING,
      engineering: LocalModelRole.LOCAL_REASONING,
      science: LocalModelRole.LOCAL_REASONING,
      government: LocalModelRole.LOCAL_REASONING,
      data_analysis: LocalModelRole.LOCAL_REASONING,
      research: LocalModelRole.LOCAL_REASONING,
      reasoning: LocalModelRole.LOCAL_REASONING,
      thinking: LocalModelRole.LOCAL_THINKING,
      operations: LocalModelRole.LOCAL_FILE_GENERATION,
      business: LocalModelRole.LOCAL_FILE_GENERATION,
      hr: LocalModelRole.LOCAL_FALLBACK_CHAT,
      sales: LocalModelRole.LOCAL_FALLBACK_CHAT,
      translation: LocalModelRole.LOCAL_FALLBACK_CHAT,
      education: LocalModelRole.LOCAL_FALLBACK_CHAT,
      customer_support: LocalModelRole.LOCAL_FALLBACK_CHAT,
      video_audio: LocalModelRole.LOCAL_FALLBACK_CHAT,
      design: LocalModelRole.LOCAL_FALLBACK_CHAT,
      logistics: LocalModelRole.LOCAL_FALLBACK_CHAT,
      hospitality: LocalModelRole.LOCAL_FALLBACK_CHAT,
      media: LocalModelRole.LOCAL_FALLBACK_CHAT,
      sustainability: LocalModelRole.LOCAL_FALLBACK_CHAT,
      creative_writing: LocalModelRole.LOCAL_FALLBACK_CHAT,
    };

    return recordGet(roleMap, category) ?? null;
  }

  private async findModelForRole(role: LocalModelRole): Promise<InstalledModelInfo | null> {
    const models = await this.promptBuilder.fetchInstalledModels();
    return models.find((m) => m.roles.includes(role)) ?? null;
  }

  private async canPreferGenericLocal(context: RoutingContext): Promise<boolean> {
    if (!this.isRuntimeHealthy('OLLAMA', context)) {
      return false;
    }

    const models = await this.promptBuilder.getInstalledModels();
    const usable = models.filter((model) => !model.roles.includes('ROUTER'));
    return usable.some((model) => this.isGenericChatModel(model));
  }

  private isGenericChatModel(model: InstalledModelInfo): boolean {
    if (model.roles.includes(LocalModelRole.LOCAL_FALLBACK_CHAT)) {
      return true;
    }

    const category = (model.category ?? '').toUpperCase();
    return category === 'GENERAL';
  }

  private buildCategoryDecision(
    model: InstalledModelInfo,
    role: LocalModelRole,
    context: RoutingContext,
  ): RoutingDecisionResult {
    const modelName = `${model.name}:${model.tag}`;
    const primary = { provider: LOCAL_PROVIDER, model: modelName };
    return {
      selectedProvider: LOCAL_PROVIDER,
      selectedModel: modelName,
      routingMode: RoutingMode.AUTO,
      confidence: CONFIDENCE_CATEGORY_KEYWORD,
      reasonTags: ['auto', 'category_specific', `role_${role.toLowerCase()}`],
      privacyClass: 'local',
      costClass: 'free',
      fallbackChain: this.buildFallbackChain(primary, context),
    };
  }

  private buildCloudCategoryDecision(
    role: LocalModelRole,
    context: RoutingContext,
    multiIntent: MultiIntentResult,
    reasonTags: string[],
  ): RoutingDecisionResult | null {
    const category = multiIntent.primary;
    const latencySlaMs =
      recordGet(CATEGORY_LATENCY_SLA_MS, category) ?? recordGet(CATEGORY_LATENCY_SLA_MS, 'general');
    const hasCodingSignal = this.detectCodingRequest(context.message);
    const hasReasoningSignal =
      this.detectReasoningRequest(context.message) || this.detectThinkingRequest(context.message);

    const build = (
      provider: string,
      model: string,
      costClass: RoutingDecisionResult['costClass'],
      confidence: number,
      extraReasonTag: string,
    ): RoutingDecisionResult => {
      const primary = { provider, model };
      return {
        selectedProvider: provider,
        selectedModel: model,
        routingMode: RoutingMode.AUTO,
        confidence,
        reasonTags: [...reasonTags, extraReasonTag],
        privacyClass: 'cloud',
        costClass,
        fallbackChain: this.buildFallbackChain(primary, context),
        detectedCategory: category,
        secondaryCategory: multiIntent.secondary ?? undefined,
        matchCount: multiIntent.matchCount,
        estimatedCostPer1M: this.estimateProviderCost(provider),
        latencySlaMs,
      };
    };

    if (role === LocalModelRole.LOCAL_CODING && hasCodingSignal) {
      if (this.isConnectorHealthy(CLOUD_PROVIDER_ANTHROPIC, context)) {
        return build(
          CLOUD_PROVIDER_ANTHROPIC,
          CLOUD_MODEL_DEFAULT,
          'high',
          0.93,
          'cloud_coding_preferred',
        );
      }
      if (this.isConnectorHealthy(CLOUD_PROVIDER_OPENAI, context)) {
        return build(
          CLOUD_PROVIDER_OPENAI,
          CLOUD_MODEL_FAST,
          'medium',
          0.86,
          'cloud_coding_fallback',
        );
      }
    }

    if (role === LocalModelRole.LOCAL_REASONING && hasReasoningSignal) {
      if (this.isConnectorHealthy(CLOUD_PROVIDER_ANTHROPIC, context)) {
        return build(
          CLOUD_PROVIDER_ANTHROPIC,
          CLOUD_MODEL_REASONING,
          'high',
          0.94,
          'cloud_reasoning_preferred',
        );
      }
      if (this.isConnectorHealthy(CLOUD_PROVIDER_GEMINI, context)) {
        return build(
          CLOUD_PROVIDER_GEMINI,
          CLOUD_MODEL_GEMINI_DEFAULT,
          'medium',
          0.88,
          'cloud_reasoning_fallback',
        );
      }
    }

    return null;
  }

  private async selectCategoryModel(message: string): Promise<string | null> {
    const role = this.detectCategoryRole(message);
    if (!role) {
      return null;
    }
    const model = await this.findModelForRole(role);
    if (!model) {
      return null;
    }
    return `${model.name}:${model.tag}`;
  }

  private buildImageFallbackChain(
    primary: FallbackEntry,
    context: RoutingContext,
  ): FallbackEntry[] {
    const candidates: FallbackEntry[] = [
      { provider: IMAGE_PROVIDER_GEMINI, model: IMAGE_MODEL_IMAGEN },
      { provider: IMAGE_PROVIDER_OPENAI, model: IMAGE_MODEL_DALLE3 },
      { provider: IMAGE_PROVIDER_LOCAL, model: IMAGE_MODEL_SD_LOCAL },
    ];

    const fallback = candidates
      .filter((candidate) => candidate.provider !== primary.provider)
      .filter((candidate) => this.isImageProviderHealthy(candidate.provider, context));

    fallback.sort(
      (a, b) =>
        this.getLatencyPenalty(a.provider, context) - this.getLatencyPenalty(b.provider, context),
    );

    return fallback;
  }

  private isImageProviderHealthy(provider: string, context: RoutingContext): boolean {
    switch (provider) {
      case IMAGE_PROVIDER_GEMINI:
        return this.isConnectorHealthy(CLOUD_PROVIDER_GEMINI, context);
      case IMAGE_PROVIDER_OPENAI:
        return this.isConnectorHealthy(CLOUD_PROVIDER_OPENAI, context);
      case IMAGE_PROVIDER_LOCAL:
        return this.isRuntimeHealthy('OLLAMA', context);
      default:
        return false;
    }
  }

  private selectBestCloudCandidate(
    context: RoutingContext,
    cloudPriority: FallbackEntry[],
  ): FallbackEntry | null {
    const healthyCandidates = cloudPriority.filter(
      (candidate) =>
        this.isConnectorHealthy(candidate.provider, context) &&
        !this.isProviderCircuitOpen(candidate.provider, context),
    );

    if (healthyCandidates.length === 0) {
      return null;
    }

    // Prefer a provider we KNOW is healthy for the primary route.
    //
    // Making unknown providers attemptable fixed the outage, but applied here
    // it also promoted them ahead of a confirmed one: on a Gemini-only install
    // the primary became the unconfigured ANTHROPIC on every request, so each
    // message burned a guaranteed-failing first attempt and recorded the wrong
    // provider in RoutingDecision. Unknown providers stay available — they are
    // simply the fallback, which is what "attemptable" was meant to mean.
    const confirmed = healthyCandidates.filter((candidate) =>
      this.isConnectorConfirmedHealthy(candidate.provider, context),
    );
    const preferred = confirmed.length > 0 ? confirmed : healthyCandidates;

    preferred.sort(
      (a, b) =>
        this.getLatencyPenalty(a.provider, context) - this.getLatencyPenalty(b.provider, context),
    );

    return preferred[0] ?? null;
  }

  private getLatencyPenalty(provider: string, context: RoutingContext): number {
    if (this.isProviderCircuitOpen(provider, context)) {
      return Number.MAX_SAFE_INTEGER;
    }

    const candidates = this.getProviderMetricCandidates(provider);
    const latencyMap = context.providerLatencyMs ?? {};
    const latencyPenaltyStepMs = context.latencyPenaltyStepMs ?? 6_000;
    let bestLatency = Number.POSITIVE_INFINITY;

    for (const candidate of candidates) {
      const value = recordGet(latencyMap, candidate);
      if (typeof value === 'number' && value > 0 && value < bestLatency) {
        bestLatency = value;
      }
    }

    if (!Number.isFinite(bestLatency)) {
      return 0;
    }

    return Math.floor(bestLatency / latencyPenaltyStepMs);
  }

  private isProviderCircuitOpen(provider: string, context: RoutingContext): boolean {
    const circuitMap = context.providerCircuitOpenUntil;
    if (!circuitMap) {
      return false;
    }

    const now = Date.now();
    const candidates = this.getProviderMetricCandidates(provider);
    return candidates.some((candidate) => {
      const openUntil = recordGet(circuitMap, candidate);
      return typeof openUntil === 'number' && openUntil > now;
    });
  }

  private getProviderMetricCandidates(provider: string): string[] {
    if (provider === LOCAL_PROVIDER || provider === IMAGE_PROVIDER_LOCAL) {
      return [provider, LOCAL_PROVIDER];
    }
    if (provider === IMAGE_PROVIDER_OPENAI) {
      return [provider, CLOUD_PROVIDER_OPENAI];
    }
    if (provider === IMAGE_PROVIDER_GEMINI) {
      return [provider, CLOUD_PROVIDER_GEMINI];
    }
    return [provider];
  }

  private isRuntimeHealthy(runtime: string, context: RoutingContext): boolean {
    if (runtime === 'OLLAMA' && this.isProviderCircuitOpen(LOCAL_PROVIDER, context)) {
      this.logger.debug(
        `isRuntimeHealthy: runtime=${runtime} healthy=false (latency circuit open)`,
      );
      return false;
    }

    // Missing health is not evidence that a runtime can execute a request.
    const healthy = recordGet(context.runtimeHealth, runtime) ?? false;
    this.logger.debug(`isRuntimeHealthy: runtime=${runtime} healthy=${String(healthy)}`);
    return healthy;
  }

  /**
   * Whether a provider may be attempted.
   *
   * This used to fail CLOSED: an empty health map, or simply a provider the map
   * had never heard of, meant "unavailable". The map is hydrated once at boot
   * from the connector service, so a single slow start left it empty for the
   * lifetime of the process and every request answered
   * `NO_REACHABLE_EXECUTION_MODEL` while three healthy connectors sat there
   * unused. Users saw "UNAVAILABLE / NONE" with a working OpenAI, Gemini and
   * Ollama Cloud configured.
   *
   * Absence of evidence is not evidence of absence, so an unknown provider is
   * now attemptable. Only a provider explicitly recorded as unhealthy, or one
   * whose latency circuit is open, is excluded — and execution still verifies
   * by actually calling it, falling through the chain when it fails. Known-good
   * providers are ordered ahead of unknown ones by the caller, so this costs a
   * wasted attempt at worst and prevents a total outage at best.
   */
  private isConnectorHealthy(provider: string, context: RoutingContext): boolean {
    if (this.isProviderCircuitOpen(provider, context)) {
      this.logger.debug(
        `isConnectorHealthy: provider=${provider} unhealthy (latency circuit open)`,
      );
      return false;
    }

    const healthMap = context.connectorHealth;
    const recorded = healthMap ? recordGet(healthMap, provider) : undefined;
    if (recorded === undefined) {
      this.logger.debug(
        `isConnectorHealthy: provider=${provider} has no health record — attemptable`,
      );
      return true;
    }

    this.logger.debug(`isConnectorHealthy: provider=${provider} healthy=${String(recorded)}`);
    return recorded;
  }

  /** True only when the provider is recorded healthy, used for ordering. */
  private isConnectorConfirmedHealthy(provider: string, context: RoutingContext): boolean {
    const healthMap = context.connectorHealth;
    return healthMap ? recordGet(healthMap, provider) === true : false;
  }

  resolveMultipleCategories(message: string): MultiIntentResult {
    const matches = this.collectCategoryMatches(message);

    if (matches.length === 0) {
      return { primary: 'general', secondary: null, confidence: 0.5, matchCount: 0 };
    }
    if (matches.length === 1) {
      const singleMatch = matches[0] as { category: string; priority: number };
      return {
        primary: singleMatch.category,
        secondary: null,
        confidence: MULTI_INTENT_CONFIDENCE_SINGLE,
        matchCount: 1,
      };
    }

    // Sort by priority (lower = higher priority, privacy-sensitive wins)
    matches.sort((a, b) => a.priority - b.priority);
    const confidence =
      matches.length > 2 ? MULTI_INTENT_CONFIDENCE_MULTI : MULTI_INTENT_CONFIDENCE_DOUBLE;
    const topMatch = matches[0] as { category: string; priority: number };

    return {
      primary: topMatch.category,
      secondary: matches[1]?.category ?? null,
      confidence,
      matchCount: matches.length,
    };
  }

  estimateProviderCost(provider: string): number {
    const costs = recordGet(PROVIDER_COST_PER_1M_TOKENS, provider);
    if (!costs) {
      return 0;
    }
    return (costs.input + costs.output) / 2;
  }

  private collectCategoryMatches(message: string): Array<{ category: string; priority: number }> {
    const matches: Array<{ category: string; priority: number }> = [];
    const detectors: Array<{ category: string; detect: (msg: string) => boolean }> = [
      { category: 'medical', detect: (m) => this.detectMedicalRequest(m) },
      { category: 'legal', detect: (m) => this.detectLegalRequest(m) },
      { category: 'finance', detect: (m) => this.detectFinanceRequest(m) },
      { category: 'government', detect: (m) => this.detectGovernmentRequest(m) },
      { category: 'executive', detect: (m) => this.detectExecutiveRequest(m) },
      { category: 'security', detect: (m) => this.detectSecurityRequest(m) },
      { category: 'engineering', detect: (m) => this.detectEngineeringRequest(m) },
      { category: 'science', detect: (m) => this.detectScienceRequest(m) },
      { category: 'coding', detect: (m) => this.detectCodingRequest(m) },
      { category: 'infrastructure', detect: (m) => this.detectInfrastructureRequest(m) },
      { category: 'data_analysis', detect: (m) => this.detectDataAnalysisRequest(m) },
      { category: 'reasoning', detect: (m) => this.detectReasoningRequest(m) },
      { category: 'thinking', detect: (m) => this.detectThinkingRequest(m) },
      { category: 'creative_writing', detect: (m) => this.detectCreativeWritingRequest(m) },
      { category: 'business', detect: (m) => this.detectBusinessRequest(m) },
      { category: 'operations', detect: (m) => this.detectOperationsRequest(m) },
      { category: 'hr', detect: (m) => this.detectHRRequest(m) },
      { category: 'sales', detect: (m) => this.detectSalesRequest(m) },
      { category: 'education', detect: (m) => this.detectEducationRequest(m) },
      { category: 'customer_support', detect: (m) => this.detectCustomerSupportRequest(m) },
      { category: 'design', detect: (m) => this.detectDesignRequest(m) },
      { category: 'media', detect: (m) => this.detectMediaRequest(m) },
      { category: 'hospitality', detect: (m) => this.detectHospitalityRequest(m) },
      { category: 'logistics', detect: (m) => this.detectLogisticsRequest(m) },
      { category: 'sustainability', detect: (m) => this.detectSustainabilityRequest(m) },
      { category: 'translation', detect: (m) => this.detectTranslationRequest(m) },
      { category: 'real_estate', detect: (m) => this.detectRealEstateRequest(m) },
      { category: 'video_audio', detect: (m) => this.detectVideoAudioRequest(m) },
      { category: 'research', detect: (m) => this.detectResearchRequest(m) },
    ];

    for (const detector of detectors) {
      if (detector.detect(message)) {
        const priority = MULTI_INTENT_PRIORITY[detector.category] ?? 6;
        matches.push({ category: detector.category, priority });
      }
    }

    return matches;
  }

  async getActivePolicies(): Promise<RoutingPolicy[]> {
    return this.policiesRepository.findActivePolicies();
  }

  /**
   * Evaluate active policies and return a mode override if any policy applies.
   * Policies are evaluated by priority (highest first). The first matching
   * policy's routingMode is used as the override.
   */
  private applyPolicies(policies: RoutingPolicy[], _context: RoutingContext): RoutingMode | null {
    if (policies.length === 0) {
      return null;
    }

    // Sort by priority descending (highest priority wins)
    const sorted = [...policies].sort((a, b) => b.priority - a.priority);
    const topPolicy = sorted[0];

    if (!topPolicy) {
      return null;
    }

    this.logger.log(
      `Applying routing policy "${topPolicy.name}" (priority=${String(topPolicy.priority)}, mode=${topPolicy.routingMode})`,
    );

    return topPolicy.routingMode;
  }

  private shouldRejectRouterSelection(message: string, decision: RouterDecisionSnapshot): boolean {
    if (decision.provider === FILE_GENERATION_PROVIDER) {
      return this.detectFileGenerationRequest({ message } as RoutingContext) === null;
    }

    if (decision.provider.startsWith('IMAGE_')) {
      return (
        this.detectImageRequest({
          message,
          connectorHealth: { GEMINI: true, OPENAI: true },
          runtimeHealth: { OLLAMA: true },
        } as RoutingContext) === null
      );
    }

    if (
      decision.provider === LOCAL_PROVIDER &&
      decision.model === LOCAL_MODEL_DEFAULT &&
      decision.reason.startsWith('Router selected unavailable ')
    ) {
      const match = decision.reason.match(
        /^Router selected unavailable ([^;]+); using local AUTO$/,
      );
      const originalProvider = match?.[1];
      if (originalProvider?.startsWith('IMAGE_')) {
        return (
          this.detectImageRequest({
            message,
            connectorHealth: { GEMINI: true, OPENAI: true },
            runtimeHealth: { OLLAMA: true },
          } as RoutingContext) === null
        );
      }

      if (originalProvider === FILE_GENERATION_PROVIDER) {
        return this.detectFileGenerationRequest({ message } as RoutingContext) === null;
      }
    }

    return false;
  }
}
