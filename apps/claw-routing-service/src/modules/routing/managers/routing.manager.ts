import { Injectable, Logger } from '@nestjs/common';
import { RoutingMode } from '../../../generated/prisma';
import { RoutingPoliciesRepository } from '../repositories/routing-policies.repository';
import { OllamaRouterManager } from './ollama-router.manager';
import {
  CLOUD_MODEL_CHEAP,
  CLOUD_MODEL_DEFAULT,
  CLOUD_MODEL_FAST,
  CLOUD_MODEL_GEMINI_DEFAULT,
  CLOUD_MODEL_REASONING,
  CLOUD_PROVIDER_ANTHROPIC,
  CLOUD_PROVIDER_DEEPSEEK,
  CLOUD_PROVIDER_GEMINI,
  CLOUD_PROVIDER_OPENAI,
  FILE_GENERATION_KEYWORDS,
  FILE_GENERATION_PROVIDER,
  IMAGE_KEYWORDS,
  IMAGE_MODEL_DALLE3,
  IMAGE_MODEL_IMAGEN,
  IMAGE_PROVIDER_GEMINI,
  IMAGE_PROVIDER_LOCAL,
  IMAGE_PROVIDER_OPENAI,
  LOCAL_MODEL_DEFAULT,
  LOCAL_PROVIDER,
} from '../constants/routing.constants';
import {
  type FallbackEntry,
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
  ) {}

  async evaluateRoute(context: RoutingContext): Promise<RoutingDecisionResult> {
    // Check active policies for overrides
    const policies = await this.policiesRepository.findActivePolicies();
    const policyOverride = this.applyPolicies(policies, context);
    const mode = policyOverride ?? context.userMode ?? RoutingMode.AUTO;

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

  buildFallbackChain(primary: FallbackEntry, context: RoutingContext): FallbackEntry[] {
    const chain: FallbackEntry[] = [];
    const isLocalPrimary = primary.provider === LOCAL_PROVIDER;

    const allCloudProviders: FallbackEntry[] = [
      { provider: CLOUD_PROVIDER_ANTHROPIC, model: CLOUD_MODEL_DEFAULT },
      { provider: CLOUD_PROVIDER_OPENAI, model: CLOUD_MODEL_FAST },
      { provider: CLOUD_PROVIDER_GEMINI, model: CLOUD_MODEL_GEMINI_DEFAULT },
    ];

    if (isLocalPrimary) {
      // Fallback from local to any healthy cloud connector
      for (const cloud of allCloudProviders) {
        if (this.isConnectorHealthy(cloud.provider, context)) {
          chain.push(cloud);
        }
      }
    } else {
      // Fallback from cloud: try local first, then other cloud connectors
      if (this.isRuntimeHealthy('OLLAMA', context)) {
        chain.push({ provider: LOCAL_PROVIDER, model: LOCAL_MODEL_DEFAULT });
      }
      for (const cloud of allCloudProviders) {
        if (
          cloud.provider !== primary.provider &&
          this.isConnectorHealthy(cloud.provider, context)
        ) {
          chain.push(cloud);
        }
      }
    }

    return chain;
  }

  private handleManualModel(context: RoutingContext): RoutingDecisionResult {
    const model = context.forcedModel ?? CLOUD_MODEL_DEFAULT;
    const provider = context.forcedProvider ?? this.inferProvider(model);
    const primary = { provider, model };
    const fallback = this.buildFallbackChain(primary, context);

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

  private handleLocalOnly(context: RoutingContext): RoutingDecisionResult {
    const primary = { provider: LOCAL_PROVIDER, model: LOCAL_MODEL_DEFAULT };
    const fallback = this.buildFallbackChain(primary, context).filter(
      (f) => f.provider === LOCAL_PROVIDER,
    );

    return {
      selectedProvider: LOCAL_PROVIDER,
      selectedModel: LOCAL_MODEL_DEFAULT,
      routingMode: RoutingMode.LOCAL_ONLY,
      confidence: 0.8,
      reasonTags: ['local_only', 'privacy_max'],
      privacyClass: 'local',
      costClass: 'free',
      fallbackChain: fallback,
    };
  }

  private handlePrivacyFirst(context: RoutingContext): RoutingDecisionResult {
    const localHealthy = this.isRuntimeHealthy('OLLAMA', context);

    if (localHealthy) {
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

    if (localHealthy) {
      const primary = { provider: LOCAL_PROVIDER, model: LOCAL_MODEL_DEFAULT };
      return {
        selectedProvider: LOCAL_PROVIDER,
        selectedModel: LOCAL_MODEL_DEFAULT,
        routingMode: RoutingMode.COST_SAVER,
        confidence: 0.85,
        reasonTags: ['cost_saver', 'free_local'],
        privacyClass: 'local',
        costClass: 'free',
        fallbackChain: this.buildFallbackChain(primary, context),
      };
    }

    const primary = { provider: CLOUD_PROVIDER_OPENAI, model: CLOUD_MODEL_CHEAP };
    return {
      selectedProvider: CLOUD_PROVIDER_OPENAI,
      selectedModel: CLOUD_MODEL_CHEAP,
      routingMode: RoutingMode.COST_SAVER,
      confidence: 0.8,
      reasonTags: ['cost_saver', 'cheapest_cloud'],
      privacyClass: 'cloud',
      costClass: 'low',
      fallbackChain: this.buildFallbackChain(primary, context),
    };
  }

  private async handleAuto(context: RoutingContext): Promise<RoutingDecisionResult> {
    // Detect image requests early (before Ollama router, which may misclassify)
    const imageResult = this.detectImageRequest(context);
    if (imageResult) {
      return imageResult;
    }

    const fileResult = this.detectFileGenerationRequest(context);
    if (fileResult) {
      return fileResult;
    }

    // Try Ollama-assisted routing first
    const ollamaDecision = await this.ollamaRouter.route(context);
    if (ollamaDecision) {
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
    this.logger.debug('Ollama router unavailable, using heuristic fallback');
    return this.handleAutoHeuristic(context);
  }

  private handleAutoHeuristic(context: RoutingContext): RoutingDecisionResult {
    // Check for image/file generation requests first
    const imageResult = this.detectImageRequest(context);
    if (imageResult) {
      return imageResult;
    }

    const fileResult = this.detectFileGenerationRequest(context);
    if (fileResult) {
      return fileResult;
    }

    const localHealthy = this.isRuntimeHealthy('OLLAMA', context);
    const messageLength = context.message.length;

    // Prefer local for short messages if Ollama is available
    if (localHealthy && messageLength < 500) {
      const primary = { provider: LOCAL_PROVIDER, model: LOCAL_MODEL_DEFAULT };
      return {
        selectedProvider: LOCAL_PROVIDER,
        selectedModel: LOCAL_MODEL_DEFAULT,
        routingMode: RoutingMode.AUTO,
        confidence: 0.7,
        reasonTags: ['auto', 'short_message', 'local_available'],
        privacyClass: 'local',
        costClass: 'free',
        fallbackChain: this.buildFallbackChain(primary, context),
      };
    }

    // For cloud: pick the best available connector in priority order
    const cloudPriority: FallbackEntry[] = [
      { provider: CLOUD_PROVIDER_ANTHROPIC, model: CLOUD_MODEL_DEFAULT },
      { provider: CLOUD_PROVIDER_OPENAI, model: CLOUD_MODEL_FAST },
      { provider: CLOUD_PROVIDER_GEMINI, model: CLOUD_MODEL_GEMINI_DEFAULT },
    ];

    const bestAvailable = cloudPriority.find((c) => this.isConnectorHealthy(c.provider, context));

    if (bestAvailable) {
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
    const lower = context.message.toLowerCase();
    const isImage = IMAGE_KEYWORDS.some((kw) => lower.includes(kw));
    if (!isImage) {
      return null;
    }

    this.logger.log('Image generation request detected via keyword heuristic');

    // Prefer cloud image providers if a connector is healthy
    if (this.isConnectorHealthy('OPENAI', context)) {
      return this.buildImageDecision(IMAGE_PROVIDER_OPENAI, IMAGE_MODEL_DALLE3, context);
    }
    if (this.isConnectorHealthy('GEMINI', context)) {
      return this.buildImageDecision(IMAGE_PROVIDER_GEMINI, IMAGE_MODEL_IMAGEN, context);
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
    const lower = context.message.toLowerCase();
    const isFileGen = FILE_GENERATION_KEYWORDS.some((kw) => lower.includes(kw));
    if (!isFileGen) {
      return null;
    }

    this.logger.log('File generation request detected via keyword heuristic');

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

  private isRuntimeHealthy(runtime: string, context: RoutingContext): boolean {
    return context.runtimeHealth?.[runtime] ?? false;
  }

  private isConnectorHealthy(provider: string, context: RoutingContext): boolean {
    // If no health data exists at all, assume connectors are available (best-effort)
    const healthMap = context.connectorHealth;
    if (!healthMap || Object.keys(healthMap).length === 0) {
      return true;
    }
    return healthMap[provider] ?? false;
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
