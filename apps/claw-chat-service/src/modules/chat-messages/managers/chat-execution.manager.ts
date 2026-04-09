import { Injectable, Logger } from '@nestjs/common';
import { AppConfig } from '../../../app/config/app.config';
import { httpRequest } from '../../../common/utilities';
import { BusinessException } from '../../../common/errors';
import {
  IMAGE_PROVIDER_PREFIX,
  OLLAMA_PROVIDER,
  PROVIDER_BASE_URLS,
} from '../../../common/constants';
import {
  type ConnectorConfigResponse,
  type ImageGenerateResponse,
  type LlmResponse,
  type MessageRoutedData,
  type OllamaGenerateRequest,
  type OllamaGenerateResponse,
  type OpenAiChatRequest,
  type OpenAiChatResponse,
  type ThreadSettings,
} from '../types/execution.types';
import { type AssembledContext } from '../types/context.types';
import { ContextAssemblyManager } from './context-assembly.manager';
import { ChatStreamService } from '../services/chat-stream.service';

@Injectable()
export class ChatExecutionManager {
  private readonly logger = new Logger(ChatExecutionManager.name);

  constructor(
    private readonly contextAssembly: ContextAssemblyManager,
    private readonly chatStreamService: ChatStreamService,
  ) {}

  async execute(
    payload: MessageRoutedData,
    context: AssembledContext,
    threadSettings?: ThreadSettings,
  ): Promise<LlmResponse> {
    const startTime = Date.now();

    // Build ordered list of providers to try
    const candidates: Array<{ provider: string; model: string }> = [
      { provider: payload.selectedProvider, model: payload.selectedModel },
    ];

    if (payload.fallbackProvider && payload.fallbackModel) {
      candidates.push({ provider: payload.fallbackProvider, model: payload.fallbackModel });
    }

    // Add all known cloud providers as last-resort fallbacks (skip duplicates)
    const allCloudProviders = [
      { provider: 'GEMINI', model: 'gemini-2.5-flash' },
      { provider: 'ANTHROPIC', model: 'claude-sonnet-4' },
      { provider: 'OPENAI', model: 'gpt-4o-mini' },
      { provider: 'DEEPSEEK', model: 'deepseek-chat' },
    ];

    for (const cloud of allCloudProviders) {
      if (!candidates.some((c) => c.provider === cloud.provider)) {
        candidates.push(cloud);
      }
    }

    let lastError: unknown = null;

    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i];
      if (!candidate) {
        continue;
      }

      try {
        return await this.callProvider(
          candidate.provider,
          candidate.model,
          context,
          startTime,
          i > 0,
          threadSettings,
        );
      } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        this.logger.warn(
          `Provider ${candidate.provider}/${candidate.model} failed (attempt ${String(i + 1)}/${String(candidates.length)}): ${errorMsg}`,
        );
        lastError = error;

        const nextCandidate = candidates[i + 1];
        this.chatStreamService.emitFallbackAttempt(payload.threadId, {
          failedProvider: candidate.provider,
          failedModel: candidate.model,
          error: errorMsg,
          attempt: i + 1,
          totalCandidates: candidates.length,
          nextProvider: nextCandidate?.provider,
          nextModel: nextCandidate?.model,
        });
      }
    }

    const finalError =
      lastError ??
      new BusinessException(
        'All LLM providers failed to generate a response',
        'LLM_EXECUTION_FAILED',
      );
    const finalErrorMsg = finalError instanceof Error ? finalError.message : 'All providers failed';
    this.chatStreamService.emitError(payload.threadId, finalErrorMsg);
    throw finalError;
  }

  private async callProvider(
    provider: string,
    model: string,
    context: AssembledContext,
    startTime: number,
    usedFallback: boolean,
    threadSettings?: ThreadSettings,
  ): Promise<LlmResponse> {
    if (provider.startsWith(IMAGE_PROVIDER_PREFIX)) {
      return this.callImageService(
        provider,
        model,
        context,
        startTime,
        usedFallback,
        context.userId,
      );
    }
    if (provider === OLLAMA_PROVIDER) {
      return this.callOllama(model, context, startTime, usedFallback, threadSettings);
    }
    return this.callCloudProvider(
      provider,
      model,
      context,
      startTime,
      usedFallback,
      threadSettings,
    );
  }

  private async callOllama(
    model: string,
    context: AssembledContext,
    startTime: number,
    usedFallback: boolean,
    _threadSettings?: ThreadSettings,
  ): Promise<LlmResponse> {
    const config = AppConfig.get();
    const prompt = this.contextAssembly.buildPromptString(context);

    const requestBody: OllamaGenerateRequest = {
      model,
      prompt,
      stream: false,
    };

    const response = await httpRequest<OllamaGenerateResponse>({
      url: `${config.OLLAMA_SERVICE_URL}/api/v1/ollama/generate`,
      method: 'POST',
      body: requestBody,
      timeoutMs: 120_000,
    });

    if (!response.ok) {
      throw new BusinessException(
        `Ollama service returned status ${String(response.status)}`,
        'OLLAMA_REQUEST_FAILED',
      );
    }

    const latencyMs = Date.now() - startTime;

    return {
      content: response.data.response,
      provider: OLLAMA_PROVIDER,
      model: response.data.model,
      inputTokens: response.data.promptEvalCount ?? undefined,
      outputTokens: response.data.evalCount ?? undefined,
      latencyMs,
      finishReason: response.data.done ? 'stop' : 'incomplete',
      usedFallback,
    };
  }

  private async callCloudProvider(
    provider: string,
    model: string,
    context: AssembledContext,
    startTime: number,
    usedFallback: boolean,
    threadSettings?: ThreadSettings,
  ): Promise<LlmResponse> {
    const connectorConfig = await this.fetchConnectorConfig(provider);
    const baseUrl = connectorConfig.baseUrl ?? PROVIDER_BASE_URLS[provider] ?? '';

    if (!baseUrl) {
      throw new BusinessException(
        `No base URL configured for provider ${provider}`,
        'MISSING_PROVIDER_BASE_URL',
      );
    }

    if (!connectorConfig.apiKey) {
      throw new BusinessException(
        `No API key configured for provider ${provider}`,
        'MISSING_PROVIDER_API_KEY',
      );
    }

    const messages = this.contextAssembly.buildChatMessages(context);
    const requestBody: OpenAiChatRequest = { model, messages, stream: false };

    if (threadSettings?.temperature !== null && threadSettings?.temperature !== undefined) {
      requestBody.temperature = threadSettings.temperature;
    }

    if (threadSettings?.maxTokens !== null && threadSettings?.maxTokens !== undefined) {
      requestBody.max_tokens = threadSettings.maxTokens;
    }

    const response = await httpRequest<OpenAiChatResponse>({
      url: `${baseUrl}/chat/completions`,
      method: 'POST',
      headers: { Authorization: `Bearer ${connectorConfig.apiKey}` },
      body: requestBody,
      timeoutMs: 120_000,
    });

    if (!response.ok) {
      throw new BusinessException(
        `Cloud provider ${provider} returned status ${String(response.status)}`,
        'CLOUD_PROVIDER_REQUEST_FAILED',
      );
    }

    const latencyMs = Date.now() - startTime;
    const firstChoice = response.data.choices[0];

    if (!firstChoice) {
      throw new BusinessException(
        `Cloud provider ${provider} returned no choices`,
        'CLOUD_PROVIDER_EMPTY_RESPONSE',
      );
    }

    return {
      content: firstChoice.message.content,
      provider,
      model,
      inputTokens: response.data.usage?.prompt_tokens,
      outputTokens: response.data.usage?.completion_tokens,
      latencyMs,
      finishReason: firstChoice.finish_reason,
      usedFallback,
    };
  }

  private async callImageService(
    provider: string,
    model: string,
    context: AssembledContext,
    startTime: number,
    usedFallback: boolean,
    userId: string,
  ): Promise<LlmResponse> {
    const config = AppConfig.get();
    const lastUserMsg = [...context.threadMessages].reverse().find((m) => m.role === 'USER');
    const prompt = lastUserMsg?.content ?? 'generate an image';

    const response = await httpRequest<ImageGenerateResponse>({
      url: `${config.IMAGE_SERVICE_URL}/api/v1/internal/images/generate`,
      method: 'POST',
      body: { prompt, provider, model, userId },
      timeoutMs: 30_000,
    });

    if (!response.ok) {
      throw new BusinessException(
        `Image service returned status ${String(response.status)}`,
        'IMAGE_SERVICE_REQUEST_FAILED',
      );
    }

    const latencyMs = Date.now() - startTime;

    return {
      content: 'Generating image\u2026',
      provider,
      model,
      latencyMs,
      finishReason: 'stop',
      usedFallback,
      imageGenerationId: response.data.generationId,
    };
  }

  private async fetchConnectorConfig(provider: string): Promise<ConnectorConfigResponse> {
    const config = AppConfig.get();
    const encodedProvider = encodeURIComponent(provider);
    const url = `${config.CONNECTOR_SERVICE_URL}/api/v1/internal/connectors/config?provider=${encodedProvider}`;

    const response = await httpRequest<ConnectorConfigResponse>({
      url,
      method: 'GET',
      timeoutMs: 10_000,
    });

    if (!response.ok) {
      throw new BusinessException(
        `Failed to fetch connector config for provider ${provider}`,
        'CONNECTOR_CONFIG_FETCH_FAILED',
      );
    }

    return response.data;
  }
}
