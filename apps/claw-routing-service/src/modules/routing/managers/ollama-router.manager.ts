import { Injectable, Logger } from "@nestjs/common";
import { AppConfig } from "../../../app/config/app.config";
import { httpRequest } from "../../../common/utilities";
import {
  LOCAL_PROVIDER,
  ollamaRouterResponseSchema,
  ROUTER_PROMPT_TEMPLATE,
  VALID_PROVIDERS,
} from "../constants/routing.constants";
import type { OllamaGenerateResponse, OllamaRouterDecision, RoutingContext } from "../types/routing.types";

@Injectable()
export class OllamaRouterManager {
  private readonly logger = new Logger(OllamaRouterManager.name);

  async route(context: RoutingContext): Promise<OllamaRouterDecision | null> {
    try {
      const config = AppConfig.get();
      const healthyProviders = this.getHealthyProviders(context);

      const prompt = ROUTER_PROMPT_TEMPLATE
        .replace("{healthyProviders}", healthyProviders.join(", ") || "all (no health data)")
        .replace("{message}", context.message.slice(0, 500));

      const response = await httpRequest<OllamaGenerateResponse>({
        url: `${config.OLLAMA_SERVICE_URL}/api/v1/ollama/generate`,
        method: "POST",
        body: {
          model: config.OLLAMA_ROUTER_MODEL,
          prompt,
          stream: false,
          options: { temperature: 0, num_predict: 200 },
        },
        timeoutMs: config.OLLAMA_ROUTER_TIMEOUT_MS,
      });

      if (!response.ok) {
        this.logger.warn(`Ollama router returned status ${String(response.status)}`);
        return null;
      }

      const parsed = this.parseResponse(response.data.response);
      if (!parsed) {
        return null;
      }

      if (!this.validateDecision(parsed, context)) {
        this.logger.warn(`Ollama router decision rejected: provider=${parsed.provider} not valid/healthy`);
        return null;
      }

      this.logger.log(
        `Ollama router decision: ${parsed.provider}/${parsed.model} (confidence=${String(parsed.confidence)}, reason=${parsed.reason})`,
      );

      return parsed;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      this.logger.warn(`Ollama router failed (falling back to heuristic): ${msg}`);
      return null;
    }
  }

  private parseResponse(raw: string): OllamaRouterDecision | null {
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        this.logger.warn("Ollama router returned no JSON");
        return null;
      }

      const parsed = JSON.parse(jsonMatch[0]) as unknown;
      const validated = ollamaRouterResponseSchema.safeParse(parsed);

      if (!validated.success) {
        this.logger.warn(`Ollama router response failed validation: ${validated.error.message}`);
        return null;
      }

      return validated.data;
    } catch {
      this.logger.warn("Ollama router response is not valid JSON");
      return null;
    }
  }

  private validateDecision(decision: OllamaRouterDecision, context: RoutingContext): boolean {
    if (!VALID_PROVIDERS.has(decision.provider)) {
      return false;
    }

    if (decision.provider === LOCAL_PROVIDER) {
      return context.runtimeHealth?.["OLLAMA"] ?? false;
    }

    const healthMap = context.connectorHealth;
    if (!healthMap || Object.keys(healthMap).length === 0) {
      return true;
    }
    return healthMap[decision.provider] ?? false;
  }

  private getHealthyProviders(context: RoutingContext): string[] {
    const healthy: string[] = [];

    if (context.runtimeHealth?.["OLLAMA"]) {
      healthy.push(LOCAL_PROVIDER);
    }

    const healthMap = context.connectorHealth ?? {};
    for (const [provider, isHealthy] of Object.entries(healthMap)) {
      if (isHealthy) {
        healthy.push(provider);
      }
    }

    return healthy;
  }
}
