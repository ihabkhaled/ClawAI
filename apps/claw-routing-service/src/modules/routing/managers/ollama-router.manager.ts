import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { AppConfig, type AppConfigType } from '../../../app/config/app.config';
import { httpRequest } from '../../../common/utilities';
import {
  LOCAL_MODEL_DEFAULT,
  LOCAL_PROVIDER,
  ollamaRouterResponseSchema,
  VALID_PROVIDERS,
} from '../constants/routing.constants';
import type {
  OllamaGenerateResponse,
  OllamaRouterDecision,
  RoutingContext,
} from '../types/routing.types';
import { PromptBuilderManager } from './prompt-builder.manager';

@Injectable()
export class OllamaRouterManager implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OllamaRouterManager.name);
  private cachedRouterModel: string | null = null;
  private warmupTimer: NodeJS.Timeout | null = null;

  constructor(private readonly promptBuilder: PromptBuilderManager) {}

  async onModuleInit(): Promise<void> {
    const config = AppConfig.get();
    if (!config.OLLAMA_ROUTER_WARMUP_ENABLED) {
      return;
    }

    await this.warmupRouterModel(config, 'startup');
    this.warmupTimer = setInterval(() => {
      void this.warmupRouterModel(config, 'interval');
    }, config.OLLAMA_ROUTER_WARMUP_INTERVAL_MS);
    this.warmupTimer.unref?.();
  }

  onModuleDestroy(): void {
    if (this.warmupTimer) {
      clearInterval(this.warmupTimer);
      this.warmupTimer = null;
    }
  }

  async route(context: RoutingContext): Promise<OllamaRouterDecision | null> {
    this.logger.log(
      `route: starting Ollama-assisted routing for thread ${context.threadId ?? 'none'}`,
    );
    try {
      const config = AppConfig.get();
      this.logger.debug('route: resolving router model');
      const routerModel = await this.resolveRouterModel(config);
      this.logger.debug(`route: using router model=${routerModel}`);

      this.logger.debug('route: collecting healthy providers');
      const healthyProviders = this.getHealthyProviders(context);
      this.logger.debug(`route: healthy providers=[${healthyProviders.join(', ')}]`);

      this.logger.debug('route: building router prompt via PromptBuilderManager');
      const promptTemplate = await this.promptBuilder.buildRouterPrompt(healthyProviders, {
        providerLatencyMs: context.providerLatencyMs,
        providerCircuitOpenUntil: context.providerCircuitOpenUntil,
        localDegradeLatencyMs: context.localDegradeLatencyMs,
        latencyPenaltyStepMs: context.latencyPenaltyStepMs,
      });
      const prompt = promptTemplate.replace('{message}', context.message.slice(0, 500));
      this.logger.debug(`route: prompt built — length=${String(prompt.length)} chars`);

      this.logger.debug(
        `route: calling Ollama router at ${config.OLLAMA_SERVICE_URL} (timeout=${String(config.OLLAMA_ROUTER_TIMEOUT_MS)}ms)`,
      );
      const response = await httpRequest<OllamaGenerateResponse>({
        url: `${config.OLLAMA_SERVICE_URL}/api/v1/ollama/generate`,
        method: 'POST',
        body: {
          model: routerModel,
          prompt,
          stream: false,
          think: false,
          keepAlive: config.OLLAMA_KEEP_ALIVE,
          options: { temperature: 0, num_predict: 80 },
        },
        timeoutMs: config.OLLAMA_ROUTER_TIMEOUT_MS,
      });

      if (!response.ok) {
        this.logger.warn(`route: Ollama router returned status ${String(response.status)}`);
        return null;
      }

      this.logger.debug(
        `route: Ollama router response received — length=${String(response.data.response.length)}`,
      );
      const parsed = this.parseResponse(response.data.response);
      if (!parsed) {
        this.logger.debug('route: failed to parse router response');
        return null;
      }

      const normalized = this.normalizeDecision(parsed);

      this.logger.debug(
        `route: parsed decision — provider=${normalized.provider} model=${normalized.model} confidence=${String(normalized.confidence)}`,
      );
      if (!this.validateDecision(normalized, context)) {
        this.logger.warn(
          `route: decision rejected — provider=${normalized.provider} not valid/healthy`,
        );
        const localFallback = this.buildLocalFallbackDecision(normalized, context);
        if (localFallback) {
          this.logger.log(
            `route: router selected unavailable provider ${normalized.provider}; using ${LOCAL_PROVIDER}/${LOCAL_MODEL_DEFAULT}`,
          );
          return { ...localFallback, routerModel };
        }
        return null;
      }

      this.logger.log(
        `route: Ollama router decision: ${normalized.provider}/${normalized.model} (confidence=${String(normalized.confidence)}, reason=${normalized.reason})`,
      );

      return { ...normalized, routerModel };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`route: Ollama router failed (falling back to heuristic): ${msg}`);
      return null;
    }
  }

  private async resolveRouterModel(config: AppConfigType): Promise<string> {
    if (this.cachedRouterModel) {
      this.logger.debug(`resolveRouterModel: using cached model=${this.cachedRouterModel}`);
      return this.cachedRouterModel;
    }

    this.logger.debug('resolveRouterModel: no cached model — fetching from ollama-service');
    try {
      const response = await httpRequest<{ model: string | null }>({
        url: `${config.OLLAMA_SERVICE_URL}/api/v1/internal/ollama/router-model`,
        method: 'GET',
        timeoutMs: 3_000,
      });

      if (response.ok && response.data.model) {
        this.cachedRouterModel = response.data.model;
        this.logger.log(`resolveRouterModel: using assigned router model=${response.data.model}`);
        return response.data.model;
      }
      this.logger.debug('resolveRouterModel: ollama-service returned no model assignment');
    } catch {
      this.logger.debug(
        'resolveRouterModel: could not fetch assigned router model, using config default',
      );
    }

    this.logger.debug(
      `resolveRouterModel: falling back to config default=${config.OLLAMA_ROUTER_MODEL}`,
    );
    return config.OLLAMA_ROUTER_MODEL;
  }

  private parseResponse(raw: string): OllamaRouterDecision | null {
    this.logger.debug(`parseResponse: parsing raw response (length=${String(raw.length)})`);
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        this.logger.warn('parseResponse: no JSON object found in Ollama router response');
        return null;
      }

      this.logger.debug('parseResponse: JSON extracted — validating with schema');
      const parsed = JSON.parse(jsonMatch[0]) as unknown;
      const validated = ollamaRouterResponseSchema.safeParse(parsed);

      if (!validated.success) {
        this.logger.warn(`parseResponse: validation failed — ${validated.error.message}`);
        return null;
      }

      this.logger.debug(
        `parseResponse: validated — provider=${validated.data.provider} model=${validated.data.model}`,
      );
      return validated.data;
    } catch {
      this.logger.warn('parseResponse: raw response is not valid JSON');
      return null;
    }
  }

  private normalizeDecision(decision: OllamaRouterDecision): OllamaRouterDecision {
    const rawProvider = decision.provider.trim();
    const provider =
      rawProvider.toLowerCase() === LOCAL_PROVIDER ? LOCAL_PROVIDER : rawProvider.toUpperCase();

    if (provider !== decision.provider) {
      this.logger.debug(
        `normalizeDecision: provider ${decision.provider} canonicalized to ${provider}`,
      );
    }

    if (provider === LOCAL_PROVIDER) {
      const model = decision.model.trim();
      if (model !== LOCAL_MODEL_DEFAULT) {
        this.logger.warn(
          `normalizeDecision: local model ${model || '(empty)'} remapped to ${LOCAL_MODEL_DEFAULT}`,
        );
        return { ...decision, provider, model: LOCAL_MODEL_DEFAULT };
      }
    }

    return { ...decision, provider, model: decision.model.trim() };
  }

  private buildLocalFallbackDecision(
    decision: OllamaRouterDecision,
    context: RoutingContext,
  ): OllamaRouterDecision | null {
    const localHealthy = context.runtimeHealth?.['OLLAMA'] ?? true;
    if (!localHealthy || decision.provider === LOCAL_PROVIDER) {
      return null;
    }

    return {
      ...decision,
      provider: LOCAL_PROVIDER,
      model: LOCAL_MODEL_DEFAULT,
      confidence: 0.6,
      reason: `Router selected unavailable ${decision.provider}; using local AUTO`,
    };
  }

  private validateDecision(decision: OllamaRouterDecision, context: RoutingContext): boolean {
    this.logger.debug(`validateDecision: validating provider=${decision.provider}`);
    if (!VALID_PROVIDERS.has(decision.provider)) {
      this.logger.debug(
        `validateDecision: provider=${decision.provider} is not in valid providers set`,
      );
      return false;
    }

    if (decision.provider === LOCAL_PROVIDER) {
      const healthy = context.runtimeHealth?.['OLLAMA'] ?? true;
      this.logger.debug(`validateDecision: local provider — ollamaHealthy=${String(healthy)}`);
      return healthy;
    }

    const healthMap = context.connectorHealth;
    if (!healthMap || Object.keys(healthMap).length === 0) {
      this.logger.debug(
        `validateDecision: no health data - treating ${decision.provider} as unavailable`,
      );
      return false;
    }
    const healthy = healthMap[decision.provider] ?? false;
    this.logger.debug(
      `validateDecision: connector ${decision.provider} healthy=${String(healthy)}`,
    );
    return healthy;
  }

  private getHealthyProviders(context: RoutingContext): string[] {
    this.logger.debug('getHealthyProviders: collecting healthy providers');
    const healthy: string[] = [];

    if (context.runtimeHealth?.['OLLAMA']) {
      this.logger.debug('getHealthyProviders: Ollama runtime is healthy');
      healthy.push(LOCAL_PROVIDER);
    }

    const healthMap = context.connectorHealth ?? {};
    for (const [provider, isHealthy] of Object.entries(healthMap)) {
      if (isHealthy) {
        this.logger.debug(`getHealthyProviders: connector ${provider} is healthy`);
        healthy.push(provider);
      }
    }

    this.logger.debug(`getHealthyProviders: total healthy=${String(healthy.length)}`);
    return healthy;
  }

  private async warmupRouterModel(config: AppConfigType, source: string): Promise<void> {
    try {
      const routerModel = await this.resolveRouterModel(config);
      const response = await httpRequest<OllamaGenerateResponse>({
        url: `${config.OLLAMA_SERVICE_URL}/api/v1/ollama/generate`,
        method: 'POST',
        body: {
          model: routerModel,
          prompt: 'Reply with: OK',
          stream: false,
          think: false,
          keepAlive: config.OLLAMA_KEEP_ALIVE,
          options: { temperature: 0, num_predict: 4 },
        },
        timeoutMs: Math.min(config.OLLAMA_ROUTER_TIMEOUT_MS, 4_000),
      });

      if (!response.ok) {
        this.logger.warn(
          `warmupRouterModel: ${source} warmup failed with status ${String(response.status)}`,
        );
        return;
      }

      this.logger.debug(`warmupRouterModel: ${source} warmup successful for ${routerModel}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`warmupRouterModel: ${source} warmup failed: ${message}`);
    }
  }
}
