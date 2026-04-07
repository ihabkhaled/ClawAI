import { Injectable, Logger } from "@nestjs/common";
import { z } from "zod";
import { AppConfig } from "../../../app/config/app.config";
import { httpRequest } from "../../../common/utilities";
import {
  CLOUD_PROVIDER_ANTHROPIC,
  CLOUD_PROVIDER_DEEPSEEK,
  CLOUD_PROVIDER_GEMINI,
  CLOUD_PROVIDER_OPENAI,
  LOCAL_PROVIDER,
} from "../constants/routing.constants";
import { type RoutingContext } from "../types/routing.types";

const VALID_PROVIDERS = new Set([
  LOCAL_PROVIDER,
  CLOUD_PROVIDER_OPENAI,
  CLOUD_PROVIDER_ANTHROPIC,
  CLOUD_PROVIDER_GEMINI,
  CLOUD_PROVIDER_DEEPSEEK,
]);

const ollamaRouterResponseSchema = z.object({
  provider: z.string().min(1),
  model: z.string().min(1),
  confidence: z.number().min(0).max(1),
  reason: z.string().min(1),
});

type OllamaGenerateResponse = {
  response: string;
  model: string;
  done: boolean;
};

export type OllamaRouterDecision = {
  provider: string;
  model: string;
  confidence: number;
  reason: string;
};

const ROUTER_PROMPT_TEMPLATE = `You are a routing engine. Given a user message, decide which AI provider and model should answer it.

Available providers and models:
- local-ollama / tinyllama (free, local, fast for simple tasks, limited reasoning)
- OPENAI / gpt-4o-mini (fast, good general purpose, low cost)
- ANTHROPIC / claude-sonnet-4 (strong reasoning, good quality, medium cost)
- GEMINI / gemini-2.5-flash (fast, multimodal, low cost)
- DEEPSEEK / deepseek-chat (good reasoning, low cost)

Healthy providers: {healthyProviders}

Rules:
- For simple greetings, math, short Q&A: prefer local-ollama
- For complex reasoning, analysis, coding: prefer ANTHROPIC or OPENAI
- For cost-sensitive: prefer local-ollama or DEEPSEEK
- Only route to healthy providers
- If unsure, use OPENAI/gpt-4o-mini

Respond with ONLY a JSON object (no markdown, no explanation):
{{"provider":"...","model":"...","confidence":0.X,"reason":"brief reason"}}

User message: {message}`;

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
