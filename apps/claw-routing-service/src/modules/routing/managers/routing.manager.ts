import { Injectable, Logger } from '@nestjs/common';
import { LocalModelRole } from '@claw/shared-types';
import { RoutingMode } from '../../../generated/prisma';
import { RoutingPoliciesRepository } from '../repositories/routing-policies.repository';
import { OllamaRouterManager } from './ollama-router.manager';
import { PromptBuilderManager } from './prompt-builder.manager';
import {
  BUSINESS_KEYWORDS,
  CATEGORY_LATENCY_SLA_MS,
  CLOUD_MODEL_CHEAP,
  CLOUD_MODEL_DEFAULT,
  CLOUD_MODEL_FAST,
  CLOUD_MODEL_GEMINI_DEFAULT,
  CLOUD_MODEL_REASONING,
  CLOUD_PROVIDER_ANTHROPIC,
  CLOUD_PROVIDER_DEEPSEEK,
  CLOUD_PROVIDER_GEMINI,
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
  IMAGE_KEYWORDS,
  IMAGE_MODEL_DALLE3,
  IMAGE_MODEL_IMAGEN,
  IMAGE_PROVIDER_GEMINI,
  IMAGE_PROVIDER_LOCAL,
  IMAGE_PROVIDER_OPENAI,
  INFRASTRUCTURE_KEYWORDS,
  LEGAL_KEYWORDS,
  LOCAL_MODEL_DEFAULT,
  LOGISTICS_KEYWORDS,
  LOCAL_PROVIDER,
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
  type MultiIntentResult,
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
  ) {}

  async evaluateRoute(context: RoutingContext): Promise<RoutingDecisionResult> {
    this.logger.log(
      `evaluateRoute: starting for thread ${context.threadId ?? 'none'}, userMode=${context.userMode ?? 'AUTO'}`,
    );
    // Check active policies for overrides
    const policies = await this.policiesRepository.findActivePolicies();
    const policyOverride = this.applyPolicies(policies, context);
    const mode = policyOverride ?? context.userMode ?? RoutingMode.AUTO;
    this.logger.debug(
      `evaluateRoute: resolved mode=${mode} (policyOverride=${policyOverride ?? 'none'})`,
    );

    switch (mode) {
      case RoutingMode.MANUAL_MODEL:
        return this.handleManualModel(context);
      case RoutingMode.LOCAL_ONLY:
        return this.handleLocalOnly(context);
      case RoutingMode.PRIVACY_FIRST:
        return this.handlePrivacyFirst(context);
      case RoutingMode.LOW_LATENCY:
        return this.handleLowLatency(context);
      case RoutingMode.HIGH_REASONING:
        return this.handleHighReasoning(context);
      case RoutingMode.COST_SAVER:
        return this.handleCostSaver(context);
      case RoutingMode.AUTO:
      default:
        return this.handleAuto(context);
    }
  }

  buildFallbackChain(
    primary: FallbackEntry,
    context: RoutingContext,
    sortByCost?: boolean,
  ): FallbackEntry[] {
    this.logger.debug(
      `buildFallbackChain: building for primary=${primary.provider}/${primary.model}`,
    );
    const chain: FallbackEntry[] = [];
    const isLocalPrimary = primary.provider === LOCAL_PROVIDER;

    const allCloudProviders: FallbackEntry[] = [
      { provider: CLOUD_PROVIDER_ANTHROPIC, model: CLOUD_MODEL_DEFAULT },
      { provider: CLOUD_PROVIDER_OPENAI, model: CLOUD_MODEL_FAST },
      { provider: CLOUD_PROVIDER_GEMINI, model: CLOUD_MODEL_GEMINI_DEFAULT },
    ];

    if (isLocalPrimary) {
      this.logger.debug('buildFallbackChain: primary is local — adding healthy cloud fallbacks');
      // Fallback from local to any healthy cloud connector
      for (const cloud of allCloudProviders) {
        if (this.isConnectorHealthy(cloud.provider, context)) {
          this.logger.debug(
            `buildFallbackChain: adding cloud fallback ${cloud.provider}/${cloud.model}`,
          );
          chain.push(cloud);
        }
      }
    } else {
      // Fallback from cloud: try local first, then other cloud connectors
      this.logger.debug('buildFallbackChain: primary is cloud — checking local + other clouds');
      if (this.isRuntimeHealthy('OLLAMA', context)) {
        this.logger.debug('buildFallbackChain: adding local fallback');
        chain.push({ provider: LOCAL_PROVIDER, model: LOCAL_MODEL_DEFAULT });
      }
      for (const cloud of allCloudProviders) {
        if (
          cloud.provider !== primary.provider &&
          this.isConnectorHealthy(cloud.provider, context)
        ) {
          this.logger.debug(
            `buildFallbackChain: adding cloud fallback ${cloud.provider}/${cloud.model}`,
          );
          chain.push(cloud);
        }
      }
    }

    // Sort by cost (cheapest first) when in cost-saving mode
    if (sortByCost) {
      chain.sort((a, b) => this.estimateProviderCost(a.provider) - this.estimateProviderCost(b.provider));
      this.logger.debug('buildFallbackChain: sorted fallbacks by cost (cheapest first)');
    }

    this.logger.debug(`buildFallbackChain: chain built with ${String(chain.length)} entries`);
    return chain;
  }

  private handleManualModel(context: RoutingContext): RoutingDecisionResult {
    const model = context.forcedModel ?? CLOUD_MODEL_DEFAULT;
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
        fallbackChain: this.buildFallbackChain(primary, context),
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

    // Privacy check FIRST — force local if sensitive content detected
    if (this.detectPrivacySensitive(context.message)) {
      this.logger.log('handleAuto: privacy-sensitive content detected — forcing local routing');
      return this.buildLocalPrivacyDecision(context, 'domain_privacy');
    }

    // Medical and legal content is inherently sensitive — force local
    if (this.detectMedicalRequest(context.message)) {
      this.logger.log('handleAuto: medical content detected — forcing local routing');
      return this.buildLocalPrivacyDecision(context, 'domain_medical');
    }
    if (this.detectLegalRequest(context.message)) {
      this.logger.log('handleAuto: legal content detected — forcing local routing');
      return this.buildLocalPrivacyDecision(context, 'domain_legal');
    }
    if (this.detectFinanceRequest(context.message)) {
      this.logger.log('handleAuto: financial content detected — forcing local routing');
      return this.buildLocalPrivacyDecision(context, 'domain_finance');
    }
    if (this.detectExecutiveRequest(context.message)) {
      this.logger.log('handleAuto: executive content detected — forcing local routing');
      return this.buildLocalPrivacyDecision(context, 'domain_executive');
    }
    if (this.detectGovernmentRequest(context.message)) {
      this.logger.log('handleAuto: government/intelligence content detected — forcing local routing');
      return this.buildLocalPrivacyDecision(context, 'domain_government');
    }

    // Detect image requests early (before Ollama router, which may misclassify)
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

    // Check category-specific local model routing
    const categoryResult = await this.detectCategoryRoute(context);
    if (categoryResult) {
      this.logger.log('handleAuto: category-specific local model matched');
      return categoryResult;
    }

    // Try Ollama-assisted routing first
    this.logger.debug('handleAuto: attempting Ollama-assisted routing');
    const ollamaDecision = await this.ollamaRouter.route(context);
    if (ollamaDecision) {
      this.logger.log(
        `handleAuto: Ollama router decided ${ollamaDecision.provider}/${ollamaDecision.model} (confidence=${String(ollamaDecision.confidence)})`,
      );
      const primary = { provider: ollamaDecision.provider, model: ollamaDecision.model };
      return {
        selectedProvider: ollamaDecision.provider,
        selectedModel: ollamaDecision.model,
        routingMode: RoutingMode.AUTO,
        confidence: ollamaDecision.confidence,
        reasonTags: ['auto', 'ollama_router', ollamaDecision.reason],
        privacyClass: ollamaDecision.provider === LOCAL_PROVIDER ? 'local' : 'cloud',
        costClass: ollamaDecision.provider === LOCAL_PROVIDER ? 'free' : 'medium',
        fallbackChain: this.buildFallbackChain(primary, context),
      };
    }

    // Fallback to heuristic routing
    this.logger.debug('handleAuto: Ollama router unavailable, using heuristic fallback');
    return this.handleAutoHeuristic(context);
  }

  private async handleAutoHeuristic(context: RoutingContext): Promise<RoutingDecisionResult> {
    this.logger.debug('handleAutoHeuristic: starting heuristic-based routing');
    // Check for image/file generation requests first
    const imageResult = this.detectImageRequest(context);
    if (imageResult) {
      this.logger.debug('handleAutoHeuristic: image request detected via heuristic');
      return imageResult;
    }

    const fileResult = this.detectFileGenerationRequest(context);
    if (fileResult) {
      this.logger.debug('handleAutoHeuristic: file generation request detected via heuristic');
      return fileResult;
    }

    // Check category-specific local model routing in heuristic path
    const categoryResult = await this.detectCategoryRoute(context);
    if (categoryResult) {
      this.logger.debug('handleAutoHeuristic: category-specific local model matched');
      return categoryResult;
    }

    const localHealthy = this.isRuntimeHealthy('OLLAMA', context);
    const messageLength = context.message.length;
    this.logger.debug(
      `handleAutoHeuristic: localHealthy=${String(localHealthy)} messageLength=${String(messageLength)}`,
    );

    // Prefer local for short messages if Ollama is available
    if (localHealthy && messageLength < 500) {
      this.logger.debug('handleAutoHeuristic: short message + local available — using local');
      const primary = { provider: LOCAL_PROVIDER, model: LOCAL_MODEL_DEFAULT };
      return {
        selectedProvider: LOCAL_PROVIDER,
        selectedModel: LOCAL_MODEL_DEFAULT,
        routingMode: RoutingMode.AUTO,
        confidence: CONFIDENCE_HEURISTIC_FALLBACK,
        reasonTags: ['auto', 'short_message', 'local_available'],
        privacyClass: 'local',
        costClass: 'free',
        fallbackChain: this.buildFallbackChain(primary, context),
      };
    }

    // For cloud: pick the best available connector in priority order
    this.logger.debug('handleAutoHeuristic: checking cloud provider availability');
    const cloudPriority: FallbackEntry[] = [
      { provider: CLOUD_PROVIDER_ANTHROPIC, model: CLOUD_MODEL_DEFAULT },
      { provider: CLOUD_PROVIDER_OPENAI, model: CLOUD_MODEL_FAST },
      { provider: CLOUD_PROVIDER_GEMINI, model: CLOUD_MODEL_GEMINI_DEFAULT },
    ];

    const bestAvailable = cloudPriority.find((c) => this.isConnectorHealthy(c.provider, context));

    if (bestAvailable) {
      this.logger.debug(
        `handleAutoHeuristic: best available cloud=${bestAvailable.provider}/${bestAvailable.model}`,
      );
      return {
        selectedProvider: bestAvailable.provider,
        selectedModel: bestAvailable.model,
        routingMode: RoutingMode.AUTO,
        confidence: 0.75,
        reasonTags: ['auto', 'cloud_preferred', 'connector_available'],
        privacyClass: 'cloud',
        costClass: 'medium',
        fallbackChain: this.buildFallbackChain(bestAvailable, context),
      };
    }

    // No connector marked healthy — still try the first configured one as a best-effort
    const firstCloud = cloudPriority[0];
    if (firstCloud) {
      this.logger.debug(
        `handleAutoHeuristic: no healthy connector — best-effort with ${firstCloud.provider}`,
      );
      return {
        selectedProvider: firstCloud.provider,
        selectedModel: firstCloud.model,
        routingMode: RoutingMode.AUTO,
        confidence: 0.5,
        reasonTags: ['auto', 'cloud_preferred', 'no_healthy_connector'],
        privacyClass: 'cloud',
        costClass: 'medium',
        fallbackChain: this.buildFallbackChain(firstCloud, context),
      };
    }

    // Ultimate fallback — local
    this.logger.debug('handleAutoHeuristic: no cloud available — ultimate fallback to local');
    return {
      selectedProvider: LOCAL_PROVIDER,
      selectedModel: LOCAL_MODEL_DEFAULT,
      routingMode: RoutingMode.AUTO,
      confidence: 0.4,
      reasonTags: ['auto', 'no_cloud_available', 'local_fallback'],
      privacyClass: 'local',
      costClass: 'free',
      fallbackChain: [],
    };
  }

  private inferProvider(model: string): string {
    this.logger.debug(`inferProvider: inferring provider for model="${model}"`);
    const lower = model.toLowerCase().replace(/^models\//, '');

    // Image generation models
    if (lower.includes('dall-e') || lower.includes('dalle')) {
      return IMAGE_PROVIDER_OPENAI;
    }
    if (lower.includes('imagen')) {
      return IMAGE_PROVIDER_GEMINI;
    }
    if (
      lower.includes('sdxl') ||
      lower.includes('stable-diffusion') ||
      lower.includes('sd-turbo')
    ) {
      return IMAGE_PROVIDER_LOCAL;
    }

    if (lower.startsWith('claude') || lower.includes('anthropic')) {
      return CLOUD_PROVIDER_ANTHROPIC;
    }
    if (
      lower.startsWith('gpt') ||
      lower.includes('openai') ||
      lower.startsWith('o1-') ||
      lower.startsWith('o3-') ||
      lower.startsWith('o4-')
    ) {
      return CLOUD_PROVIDER_OPENAI;
    }
    if (lower.includes('gemini')) {
      return CLOUD_PROVIDER_GEMINI;
    }
    if (lower.includes('deepseek')) {
      return CLOUD_PROVIDER_DEEPSEEK;
    }
    if (
      lower.includes('llama') ||
      lower.includes('mistral') ||
      lower.includes('phi') ||
      lower.includes('qwen') ||
      lower.includes('tinyllama')
    ) {
      return LOCAL_PROVIDER;
    }
    return CLOUD_PROVIDER_ANTHROPIC;
  }

  private detectImageRequest(context: RoutingContext): RoutingDecisionResult | null {
    this.logger.debug('detectImageRequest: scanning message for image keywords');
    const lower = context.message.toLowerCase();

    // Exact keyword match
    const exactMatch = IMAGE_KEYWORDS.some((kw) => lower.includes(kw));

    // Smart verb + image-word combo detection
    const imageVerbs = [
      'generate',
      'create',
      'draw',
      'make',
      'paint',
      'render',
      'design',
      'produce',
      'recreate',
      'reproduce',
      'remake',
      'redo',
    ];
    const imageWords = [
      'image',
      'picture',
      'photo',
      'portrait',
      'illustration',
      'sketch',
      'art',
      'artwork',
      'graphic',
      'poster',
      'banner',
      'icon',
      'logo',
      'wallpaper',
      'avatar',
      'cartoon',
      'anime',
      'manga',
      'comic',
      'sticker',
      'mascot',
      'character',
      'scene',
      'landscape',
      'cityscape',
      'infographic',
      'diagram',
      'wireframe',
      'mockup',
      'thumbnail',
      'cover',
      'texture',
      'pattern',
      'meme',
      'gif',
    ];
    const hasVerb = imageVerbs.some((v) => lower.includes(v));
    const hasImageWord = imageWords.some((w) => lower.includes(w));
    const comboMatch = hasVerb && hasImageWord;

    // Strong image nouns that indicate visual output even without a verb
    const strongImageNouns = [
      'illustration',
      'portrait',
      'poster',
      'logo',
      'banner',
      'sticker',
      'mascot',
      'wallpaper',
      'avatar',
      'icon',
      'infographic',
      'wireframe',
      'mockup',
      'thumbnail',
      'cartoon',
      'comic strip',
      'manga',
      'anime',
    ];
    const hasStrongNoun = strongImageNouns.some((n) => lower.includes(n));
    // If prompt has a strong image noun + another image-related word, it is likely visual
    const strongNounMatch = hasStrongNoun && (hasImageWord || hasVerb);

    // Art style keywords that alone strongly indicate image generation
    const artStyleIndicators = [
      'photorealistic',
      'watercolor',
      'oil painting',
      'impressionist',
      'cyberpunk',
      'pixel art',
      'abstract art',
      'digital art',
      'concept art',
      'fan art',
      'line art',
      'pop art',
      'vintage poster',
      'retro style',
      'minimalist design',
      'botanical illustration',
      'still life',
      'floor plan',
      'anime style',
      'comic strip',
      'sticker design',
    ];
    const artStyleMatch = artStyleIndicators.some((s) => lower.includes(s));

    // Reference-based phrases that imply image generation even without explicit image words
    const referenceVerbs = ['recreate', 'reproduce', 'remake'];
    const referenceMatch =
      referenceVerbs.some((v) => lower.includes(v)) &&
      (lower.includes('this') || lower.includes('attached'));

    this.logger.debug(
      `detectImageRequest: exactMatch=${String(exactMatch)} comboMatch=${String(comboMatch)} referenceMatch=${String(referenceMatch)} artStyleMatch=${String(artStyleMatch)}`,
    );
    if (!exactMatch && !comboMatch && !referenceMatch && !artStyleMatch && !strongNounMatch) {
      this.logger.debug('detectImageRequest: no image request detected');
      return null;
    }

    this.logger.log('detectImageRequest: image generation request detected via keyword heuristic');

    // Prefer Gemini for image generation, then OpenAI
    if (this.isConnectorHealthy('GEMINI', context)) {
      return this.buildImageDecision(IMAGE_PROVIDER_GEMINI, IMAGE_MODEL_IMAGEN, context);
    }
    if (this.isConnectorHealthy('OPENAI', context)) {
      return this.buildImageDecision(IMAGE_PROVIDER_OPENAI, IMAGE_MODEL_DALLE3, context);
    }

    // Fallback to local SD
    return this.buildImageDecision(IMAGE_PROVIDER_LOCAL, 'sdxl-turbo', context);
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
    const lower = message.toLowerCase();
    return CODING_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase()));
  }

  detectReasoningRequest(message: string): boolean {
    const lower = message.toLowerCase();
    return REASONING_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase()));
  }

  detectThinkingRequest(message: string): boolean {
    const lower = message.toLowerCase();
    return THINKING_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase()));
  }

  detectInfrastructureRequest(message: string): boolean {
    const lower = message.toLowerCase();
    return INFRASTRUCTURE_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase()));
  }

  detectDataAnalysisRequest(message: string): boolean {
    const lower = message.toLowerCase();
    return DATA_ANALYSIS_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase()));
  }

  detectBusinessRequest(message: string): boolean {
    const lower = message.toLowerCase();
    return BUSINESS_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase()));
  }

  detectCreativeWritingRequest(message: string): boolean {
    const lower = message.toLowerCase();
    return CREATIVE_WRITING_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase()));
  }

  detectSecurityRequest(message: string): boolean {
    const lower = message.toLowerCase();
    return SECURITY_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase()));
  }

  detectMedicalRequest(message: string): boolean {
    const lower = message.toLowerCase();
    return MEDICAL_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase()));
  }

  detectLegalRequest(message: string): boolean {
    const lower = message.toLowerCase();
    return LEGAL_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase()));
  }

  detectTranslationRequest(message: string): boolean {
    const lower = message.toLowerCase();
    return TRANSLATION_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase()));
  }

  detectHRRequest(message: string): boolean {
    const lower = message.toLowerCase();
    return HR_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase()));
  }

  detectFinanceRequest(message: string): boolean {
    const lower = message.toLowerCase();
    return FINANCE_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase()));
  }

  detectOperationsRequest(message: string): boolean {
    const lower = message.toLowerCase();
    return OPERATIONS_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase()));
  }

  detectSalesRequest(message: string): boolean {
    const lower = message.toLowerCase();
    return SALES_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase()));
  }

  detectRealEstateRequest(message: string): boolean {
    const lower = message.toLowerCase();
    return REAL_ESTATE_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase()));
  }

  detectEducationRequest(message: string): boolean {
    const lower = message.toLowerCase();
    return EDUCATION_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase()));
  }

  detectCustomerSupportRequest(message: string): boolean {
    const lower = message.toLowerCase();
    return CUSTOMER_SUPPORT_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase()));
  }

  detectVideoAudioRequest(message: string): boolean {
    const lower = message.toLowerCase();
    return VIDEO_AUDIO_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase()));
  }

  detectDesignRequest(message: string): boolean {
    const lower = message.toLowerCase();
    return DESIGN_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase()));
  }

  detectResearchRequest(message: string): boolean {
    const lower = message.toLowerCase();
    return RESEARCH_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase()));
  }

  detectExecutiveRequest(message: string): boolean {
    const lower = message.toLowerCase();
    return EXECUTIVE_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase()));
  }

  detectEngineeringRequest(message: string): boolean {
    const lower = message.toLowerCase();
    return ENGINEERING_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase()));
  }

  detectScienceRequest(message: string): boolean {
    const lower = message.toLowerCase();
    return SCIENCE_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase()));
  }

  detectGovernmentRequest(message: string): boolean {
    const lower = message.toLowerCase();
    return GOVERNMENT_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase()));
  }

  detectLogisticsRequest(message: string): boolean {
    const lower = message.toLowerCase();
    return LOGISTICS_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase()));
  }

  detectHospitalityRequest(message: string): boolean {
    const lower = message.toLowerCase();
    return HOSPITALITY_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase()));
  }

  detectMediaRequest(message: string): boolean {
    const lower = message.toLowerCase();
    return MEDIA_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase()));
  }

  detectSustainabilityRequest(message: string): boolean {
    const lower = message.toLowerCase();
    return SUSTAINABILITY_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase()));
  }

  detectPrivacySensitive(message: string): boolean {
    const lower = message.toLowerCase();
    return PRIVACY_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase()));
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
    const latencySlaMs = CATEGORY_LATENCY_SLA_MS[category] ?? CATEGORY_LATENCY_SLA_MS['general'];

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
    if (!this.isRuntimeHealthy('OLLAMA', context)) {
      return null;
    }

    const multiIntent = this.resolveMultipleCategories(context.message);
    if (multiIntent.primary === 'general') {
      return null;
    }

    const role = this.mapCategoryToRole(multiIntent.primary);
    if (!role) {
      return null;
    }

    const latencySlaMs = CATEGORY_LATENCY_SLA_MS[multiIntent.primary] ?? CATEGORY_LATENCY_SLA_MS['general'];
    const estimatedCostPer1M = this.estimateProviderCost(LOCAL_PROVIDER);

    const reasonTags = this.buildCategoryReasonTags(multiIntent, role);

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

  private buildCategoryReasonTags(
    multiIntent: MultiIntentResult,
    role: LocalModelRole,
  ): string[] {
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

    return roleMap[category] ?? null;
  }

  private async findModelForRole(role: LocalModelRole): Promise<InstalledModelInfo | null> {
    const models = await this.promptBuilder.fetchInstalledModels();
    return models.find((m) => m.roles.includes(role)) ?? null;
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

  private isRuntimeHealthy(runtime: string, context: RoutingContext): boolean {
    // If no health data exists, assume healthy (best-effort — same as connectors)
    const healthy = context.runtimeHealth?.[runtime] ?? true;
    this.logger.debug(`isRuntimeHealthy: runtime=${runtime} healthy=${String(healthy)}`);
    return healthy;
  }

  private isConnectorHealthy(provider: string, context: RoutingContext): boolean {
    // If no health data exists at all, assume connectors are available (best-effort)
    const healthMap = context.connectorHealth;
    if (!healthMap || Object.keys(healthMap).length === 0) {
      this.logger.debug(`isConnectorHealthy: no health data — assuming ${provider} is available`);
      return true;
    }
    const healthy = healthMap[provider] ?? false;
    this.logger.debug(`isConnectorHealthy: provider=${provider} healthy=${String(healthy)}`);
    return healthy;
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
    const costs = PROVIDER_COST_PER_1M_TOKENS[provider];
    if (!costs) {
      return 0;
    }
    return (costs.input + costs.output) / 2;
  }

  private collectCategoryMatches(
    message: string,
  ): Array<{ category: string; priority: number }> {
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
}
