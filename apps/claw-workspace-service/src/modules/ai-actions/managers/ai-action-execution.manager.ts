import { HttpStatus, Injectable, Logger } from '@nestjs/common';

import { AppConfig } from '../../../app/config/app.config';
import { AiActionMode } from '../../../common/enums/ai-action-kind.enum';
import { BusinessException } from '../../../common/errors/business.exception';
import { AI_ACTION_FALLBACK_LOCAL_PROVIDER } from '../constants/ai-action-prompts.constants';
import type {
  AiActionResult,
  CloudGenerateOutput,
  ModelChoice,
  RunAiActionInput,
} from '../types/ai-action.types';
import { buildAiActionPrompt, combineSystemAndUser } from '../utilities/ai-action-prompt.utility';
import { callCloudGenerate } from '../utilities/cloud-generation-client.utility';
import { callOllamaGenerate } from '../utilities/ollama-generation-client.utility';

import { AutoRouterManager } from './auto-router.manager';
import { ModelCatalogResolverManager } from './model-catalog-resolver.manager';

@Injectable()
export class AiActionExecutionManager {
  private readonly logger = new Logger(AiActionExecutionManager.name);

  constructor(
    private readonly router: AutoRouterManager,
    private readonly resolver: ModelCatalogResolverManager,
  ) {}

  async run(input: RunAiActionInput): Promise<AiActionResult> {
    const resolution = await this.router.resolve({
      actionKind: input.actionKind,
      privacyClass: input.privacyClass,
      preferredModel: input.preferredModel,
    });
    const { systemPrompt, userPrompt } = buildAiActionPrompt(input.actionKind, input.context);
    const started = Date.now();
    const modelsToTry = await this.buildAttemptChain(
      resolution.primary,
      resolution.fallbackChain,
      resolution.mode,
    );
    let lastError: Error | undefined;
    for (const model of modelsToTry) {
      try {
        this.logger.log(
          `run: action=${input.actionKind} provider=${model.provider} model=${model.model}`,
        );
        const generation = await this.executeGeneration(model, systemPrompt, userPrompt);
        return {
          content: generation.content,
          generatedBy: {
            provider: model.provider,
            model: model.model,
            displayName: model.displayName,
            mode: resolution.mode,
            fallbackChain: resolution.fallbackChain,
          },
          durationMs: Date.now() - started,
          inputTokens: generation.inputTokens,
          outputTokens: generation.outputTokens,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.logger.warn(
          `run: ${model.provider}/${model.model} failed — ${lastError.message} — trying next`,
        );
      }
    }
    // Surface upstream errors to the user with a 4xx (so the frontend's
    // ApiClient doesn't mask the message as a generic 5xx). 422 is the
    // closest match: the request was well-formed, but the upstream LLM
    // provider couldn't fulfil it (subscription required, rate-limited,
    // model unavailable, aborted by timeout, etc).
    const userMessage = this.summariseUpstreamFailure(modelsToTry, lastError);
    throw new BusinessException(
      userMessage,
      'AI_ACTION_UPSTREAM_FAILED',
      HttpStatus.UNPROCESSABLE_ENTITY,
      { triedModels: modelsToTry.map((m) => `${m.provider}/${m.model}`) },
    );
  }

  // Builds a one-line, user-readable explanation of why the AI call failed.
  // Strips the JSON envelope our internal services add and pulls the
  // upstream provider's message to the front so users see "this model
  // requires a subscription" rather than "Internal server error".
  private summariseUpstreamFailure(
    modelsToTry: ModelChoice[],
    lastError: Error | undefined,
  ): string {
    const tried = modelsToTry.map((m) => `${m.provider}/${m.model}`).join(', ');
    if (lastError === undefined) {
      return `All models exhausted with no error captured (tried: ${tried})`;
    }
    // Errors thrown by callCloudGenerate look like:
    //   Cloud generation failed (HTTP 400): {"statusCode":400,"message":"...","code":"..."}
    // Pull the inner `message` out so the user sees the upstream reason.
    const match = lastError.message.match(/"message"\s*:\s*"([^"]+)"/);
    const upstream = match ? match[1] : lastError.message;
    if (modelsToTry.length === 1) {
      return `${modelsToTry[0]?.provider}/${modelsToTry[0]?.model}: ${upstream}`;
    }
    return `All ${String(modelsToTry.length)} models failed. Last error from ${modelsToTry[modelsToTry.length - 1]?.provider}/${modelsToTry[modelsToTry.length - 1]?.model}: ${upstream}`;
  }

  private async buildAttemptChain(
    primary: ModelChoice,
    declaredFallbacks: ModelChoice[],
    mode: AiActionMode,
  ): Promise<ModelChoice[]> {
    const chain = [primary, ...declaredFallbacks];
    // MANUAL mode = user explicitly picked a model. Respect it: don't
    // tack on a safety-net fallback that would silently swap to a slow
    // local model (e.g. gemma3:27b) when the chosen model rate-limits or
    // returns a subscription error. The upstream error should surface so
    // the user can pick a different model — not get a 90s mystery wait.
    if (mode === AiActionMode.MANUAL) {
      return chain;
    }
    const safetyNet = await this.resolver.resolveDefaults({ preferLocal: true });
    const additions: ModelChoice[] = [];
    if (safetyNet.primary !== null && !this.alreadyInChain(chain, safetyNet.primary)) {
      additions.push(safetyNet.primary);
    }
    for (const candidate of safetyNet.fallbackChain) {
      if (!this.alreadyInChain([...chain, ...additions], candidate)) {
        additions.push(candidate);
      }
    }
    return [...chain, ...additions];
  }

  private alreadyInChain(chain: ModelChoice[], candidate: ModelChoice): boolean {
    return chain.some((c) => c.provider === candidate.provider && c.model === candidate.model);
  }

  private async executeGeneration(
    model: ModelChoice,
    systemPrompt: string,
    userPrompt: string,
  ): Promise<CloudGenerateOutput> {
    const config = AppConfig.get();
    if (model.provider === AI_ACTION_FALLBACK_LOCAL_PROVIDER) {
      const prompt = combineSystemAndUser(systemPrompt, userPrompt);
      const result = await callOllamaGenerate({
        baseUrl: config.OLLAMA_SERVICE_URL,
        model: model.model,
        prompt,
        timeoutMs: config.AI_ACTION_REQUEST_TIMEOUT_MS,
      });
      return {
        content: result.content,
        inputTokens: result.promptEvalCount,
        outputTokens: result.evalCount,
      };
    }
    return callCloudGenerate({
      chatServiceUrl: config.CHAT_SERVICE_URL,
      provider: model.provider,
      model: model.model,
      systemPrompt,
      userPrompt,
      timeoutMs: config.AI_ACTION_REQUEST_TIMEOUT_MS,
    });
  }
}
