import { Injectable, Logger } from '@nestjs/common';

import { AppConfig } from '../../../app/config/app.config';
import { AI_ACTION_FALLBACK_LOCAL_PROVIDER } from '../constants/ai-action-prompts.constants';
import { LOCAL_FALLBACK_CHAIN } from '../constants/ai-action-routes.constants';
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

@Injectable()
export class AiActionExecutionManager {
  private readonly logger = new Logger(AiActionExecutionManager.name);

  constructor(private readonly router: AutoRouterManager) {}

  async run(input: RunAiActionInput): Promise<AiActionResult> {
    const resolution = this.router.resolve({
      actionKind: input.actionKind,
      privacyClass: input.privacyClass,
      preferredModel: input.preferredModel,
    });
    const { systemPrompt, userPrompt } = buildAiActionPrompt(input.actionKind, input.context);
    const started = Date.now();

    // Build deduplicated attempt list: primary → declared fallbacks → local safety net
    const chain = [resolution.primary, ...resolution.fallbackChain];
    const localSafeNet = LOCAL_FALLBACK_CHAIN.filter(
      (m) => !chain.some((c) => c.provider === m.provider && c.model === m.model),
    );
    const modelsToTry = [...chain, ...localSafeNet];

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

    throw lastError ?? new Error('All models in fallback chain exhausted');
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
