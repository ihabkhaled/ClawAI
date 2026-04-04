import { Injectable } from "@nestjs/common";
import { RoutingMode } from "../../../generated/prisma";
import { RoutingPoliciesRepository } from "../repositories/routing-policies.repository";
import {
  type RoutingContext,
  type RoutingDecisionResult,
  type FallbackEntry,
  type RoutingPolicy,
} from "../types/routing.types";

const LOCAL_PROVIDER = "local-ollama";
const LOCAL_MODEL_DEFAULT = "llama3:latest";
const CLOUD_PROVIDER_OPENAI = "openai";
const CLOUD_PROVIDER_ANTHROPIC = "anthropic";
const CLOUD_MODEL_REASONING = "claude-opus-4";
const CLOUD_MODEL_FAST = "gpt-4o-mini";
const CLOUD_MODEL_CHEAP = "gpt-4o-mini";
const CLOUD_MODEL_DEFAULT = "claude-sonnet-4";

@Injectable()
export class RoutingManager {
  constructor(
    private readonly policiesRepository: RoutingPoliciesRepository,
  ) {}

  async evaluateRoute(context: RoutingContext): Promise<RoutingDecisionResult> {
    const mode = context.userMode ?? RoutingMode.AUTO;

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
  ): FallbackEntry[] {
    const chain: FallbackEntry[] = [];
    const isLocalPrimary = primary.provider === LOCAL_PROVIDER;

    if (isLocalPrimary) {
      if (this.isConnectorHealthy(CLOUD_PROVIDER_ANTHROPIC, context)) {
        chain.push({ provider: CLOUD_PROVIDER_ANTHROPIC, model: CLOUD_MODEL_DEFAULT });
      }
      if (this.isConnectorHealthy(CLOUD_PROVIDER_OPENAI, context)) {
        chain.push({ provider: CLOUD_PROVIDER_OPENAI, model: CLOUD_MODEL_FAST });
      }
    } else {
      if (this.isRuntimeHealthy("OLLAMA", context)) {
        chain.push({ provider: LOCAL_PROVIDER, model: LOCAL_MODEL_DEFAULT });
      }
      const otherCloud = primary.provider === CLOUD_PROVIDER_OPENAI
        ? CLOUD_PROVIDER_ANTHROPIC
        : CLOUD_PROVIDER_OPENAI;
      const otherModel = otherCloud === CLOUD_PROVIDER_ANTHROPIC
        ? CLOUD_MODEL_DEFAULT
        : CLOUD_MODEL_FAST;
      if (this.isConnectorHealthy(otherCloud, context)) {
        chain.push({ provider: otherCloud, model: otherModel });
      }
    }

    return chain;
  }

  private handleManualModel(context: RoutingContext): RoutingDecisionResult {
    const model = context.forcedModel ?? CLOUD_MODEL_DEFAULT;
    const provider = this.inferProvider(model);
    const primary = { provider, model };
    const fallback = this.buildFallbackChain(primary, context);

    return {
      selectedProvider: provider,
      selectedModel: model,
      routingMode: RoutingMode.MANUAL_MODEL,
      confidence: 1.0,
      reasonTags: ["user_forced"],
      privacyClass: "unknown",
      costClass: "unknown",
      fallbackChain: fallback,
    };
  }

  private handleLocalOnly(context: RoutingContext): RoutingDecisionResult {
    const primary = { provider: LOCAL_PROVIDER, model: LOCAL_MODEL_DEFAULT };
    const fallback = this.buildFallbackChain(primary, context)
      .filter((f) => f.provider === LOCAL_PROVIDER);

    return {
      selectedProvider: LOCAL_PROVIDER,
      selectedModel: LOCAL_MODEL_DEFAULT,
      routingMode: RoutingMode.LOCAL_ONLY,
      confidence: 0.8,
      reasonTags: ["local_only", "privacy_max"],
      privacyClass: "local",
      costClass: "free",
      fallbackChain: fallback,
    };
  }

  private handlePrivacyFirst(context: RoutingContext): RoutingDecisionResult {
    const localHealthy = this.isRuntimeHealthy("OLLAMA", context);

    if (localHealthy) {
      const primary = { provider: LOCAL_PROVIDER, model: LOCAL_MODEL_DEFAULT };
      return {
        selectedProvider: LOCAL_PROVIDER,
        selectedModel: LOCAL_MODEL_DEFAULT,
        routingMode: RoutingMode.PRIVACY_FIRST,
        confidence: 0.85,
        reasonTags: ["privacy_first", "local_preferred"],
        privacyClass: "local",
        costClass: "free",
        fallbackChain: this.buildFallbackChain(primary, context),
      };
    }

    const primary = { provider: CLOUD_PROVIDER_ANTHROPIC, model: CLOUD_MODEL_DEFAULT };
    return {
      selectedProvider: CLOUD_PROVIDER_ANTHROPIC,
      selectedModel: CLOUD_MODEL_DEFAULT,
      routingMode: RoutingMode.PRIVACY_FIRST,
      confidence: 0.6,
      reasonTags: ["privacy_first", "local_unavailable", "cloud_fallback"],
      privacyClass: "cloud",
      costClass: "medium",
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
      reasonTags: ["low_latency", "fastest_model"],
      privacyClass: "cloud",
      costClass: "low",
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
      reasonTags: ["high_reasoning", "strongest_model"],
      privacyClass: "cloud",
      costClass: "high",
      fallbackChain: this.buildFallbackChain(primary, context),
    };
  }

  private handleCostSaver(context: RoutingContext): RoutingDecisionResult {
    const localHealthy = this.isRuntimeHealthy("OLLAMA", context);

    if (localHealthy) {
      const primary = { provider: LOCAL_PROVIDER, model: LOCAL_MODEL_DEFAULT };
      return {
        selectedProvider: LOCAL_PROVIDER,
        selectedModel: LOCAL_MODEL_DEFAULT,
        routingMode: RoutingMode.COST_SAVER,
        confidence: 0.85,
        reasonTags: ["cost_saver", "free_local"],
        privacyClass: "local",
        costClass: "free",
        fallbackChain: this.buildFallbackChain(primary, context),
      };
    }

    const primary = { provider: CLOUD_PROVIDER_OPENAI, model: CLOUD_MODEL_CHEAP };
    return {
      selectedProvider: CLOUD_PROVIDER_OPENAI,
      selectedModel: CLOUD_MODEL_CHEAP,
      routingMode: RoutingMode.COST_SAVER,
      confidence: 0.8,
      reasonTags: ["cost_saver", "cheapest_cloud"],
      privacyClass: "cloud",
      costClass: "low",
      fallbackChain: this.buildFallbackChain(primary, context),
    };
  }

  private handleAuto(context: RoutingContext): RoutingDecisionResult {
    const localHealthy = this.isRuntimeHealthy("OLLAMA", context);
    const messageLength = context.message.length;

    if (localHealthy && messageLength < 500) {
      const primary = { provider: LOCAL_PROVIDER, model: LOCAL_MODEL_DEFAULT };
      return {
        selectedProvider: LOCAL_PROVIDER,
        selectedModel: LOCAL_MODEL_DEFAULT,
        routingMode: RoutingMode.AUTO,
        confidence: 0.7,
        reasonTags: ["auto", "short_message", "local_available"],
        privacyClass: "local",
        costClass: "free",
        fallbackChain: this.buildFallbackChain(primary, context),
      };
    }

    const primary = { provider: CLOUD_PROVIDER_ANTHROPIC, model: CLOUD_MODEL_DEFAULT };
    return {
      selectedProvider: CLOUD_PROVIDER_ANTHROPIC,
      selectedModel: CLOUD_MODEL_DEFAULT,
      routingMode: RoutingMode.AUTO,
      confidence: 0.75,
      reasonTags: ["auto", "cloud_preferred"],
      privacyClass: "cloud",
      costClass: "medium",
      fallbackChain: this.buildFallbackChain(primary, context),
    };
  }

  private inferProvider(model: string): string {
    if (model.startsWith("claude") || model.startsWith("anthropic")) {
      return CLOUD_PROVIDER_ANTHROPIC;
    }
    if (model.startsWith("gpt") || model.startsWith("openai")) {
      return CLOUD_PROVIDER_OPENAI;
    }
    if (model.includes("llama") || model.includes("mistral") || model.includes("phi")) {
      return LOCAL_PROVIDER;
    }
    return CLOUD_PROVIDER_ANTHROPIC;
  }

  private isRuntimeHealthy(runtime: string, context: RoutingContext): boolean {
    return context.runtimeHealth?.[runtime] ?? false;
  }

  private isConnectorHealthy(provider: string, context: RoutingContext): boolean {
    return context.connectorHealth?.[provider] ?? false;
  }

  async getActivePolicies(): Promise<RoutingPolicy[]> {
    return this.policiesRepository.findActivePolicies();
  }
}
