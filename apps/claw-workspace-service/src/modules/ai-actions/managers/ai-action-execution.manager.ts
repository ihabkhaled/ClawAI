import { Injectable, Logger } from '@nestjs/common';

import { AppConfig } from '../../../app/config/app.config';
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
    const primary = resolution.primary;
    const { systemPrompt, userPrompt } = buildAiActionPrompt(input.actionKind, input.context);
    this.logger.log(
      `run: action=${input.actionKind} provider=${primary.provider} model=${primary.model}`,
    );
    const started = Date.now();
    const generation = await this.executeGeneration(primary, systemPrompt, userPrompt);
    return {
      content: generation.content,
      generatedBy: {
        provider: primary.provider,
        model: primary.model,
        displayName: primary.displayName,
        mode: resolution.mode,
        fallbackChain: resolution.fallbackChain,
      },
      durationMs: Date.now() - started,
      inputTokens: generation.inputTokens,
      outputTokens: generation.outputTokens,
    };
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
