import { Injectable, Logger } from '@nestjs/common';

import { AppConfig } from '../../../app/config/app.config';
import { AI_ACTION_FALLBACK_LOCAL_PROVIDER } from '../constants/ai-action-prompts.constants';
import type { AiActionResult, ModelChoice, RunAiActionInput } from '../types/ai-action.types';
import { buildAiActionPrompt, combineSystemAndUser } from '../utilities/ai-action-prompt.utility';
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

    const executable = this.pickExecutableLocalModel(resolution.primary, resolution.fallbackChain);
    const { systemPrompt, userPrompt } = buildAiActionPrompt(input.actionKind, input.context);
    const prompt = combineSystemAndUser(systemPrompt, userPrompt);

    const config = AppConfig.get();
    this.logger.log(
      `run: action=${input.actionKind} model=${executable.model} provider=${executable.provider}`,
    );

    const started = Date.now();
    const generation = await callOllamaGenerate({
      baseUrl: config.OLLAMA_SERVICE_URL,
      model: executable.model,
      prompt,
      timeoutMs: config.AI_ACTION_REQUEST_TIMEOUT_MS,
    });
    const durationMs = Date.now() - started;

    return {
      content: generation.content,
      generatedBy: {
        provider: executable.provider,
        model: executable.model,
        displayName: executable.displayName,
        mode: resolution.mode,
        fallbackChain: resolution.fallbackChain,
      },
      durationMs,
      inputTokens: generation.promptEvalCount,
      outputTokens: generation.evalCount,
    };
  }

  private pickExecutableLocalModel(
    primary: ModelChoice,
    fallbackChain: ModelChoice[],
  ): ModelChoice {
    if (primary.provider === AI_ACTION_FALLBACK_LOCAL_PROVIDER) {
      return primary;
    }
    const localInFallback = fallbackChain.find(
      (entry) => entry.provider === AI_ACTION_FALLBACK_LOCAL_PROVIDER,
    );
    if (localInFallback !== undefined) {
      this.logger.log(
        `pickExecutableLocalModel: primary provider=${primary.provider} is not executable via Ollama — using local fallback ${localInFallback.model}`,
      );
      return localInFallback;
    }
    const config = AppConfig.get();
    this.logger.log(
      `pickExecutableLocalModel: no local model in chain — using configured default ${config.AI_ACTION_LOCAL_MODEL}`,
    );
    return {
      provider: AI_ACTION_FALLBACK_LOCAL_PROVIDER,
      model: config.AI_ACTION_LOCAL_MODEL,
      displayName: `${config.AI_ACTION_LOCAL_MODEL} (local)`,
    };
  }
}
