import { Injectable, Logger } from "@nestjs/common";
import { AppConfig } from "../../../app/config/app.config";
import { httpRequest } from "../../../common/utilities";
import { BusinessException } from "../../../common/errors";
import {
  OLLAMA_PROVIDER,
  THREAD_CONTEXT_LIMIT,
  PROVIDER_BASE_URLS,
} from "../../../common/constants";
import { type ChatMessage } from "../../../generated/prisma";
import {
  type LlmResponse,
  type MessageRoutedData,
  type OllamaGenerateRequest,
  type OllamaGenerateResponse,
  type OpenAiChatMessage,
  type OpenAiChatRequest,
  type OpenAiChatResponse,
  type ConnectorConfigResponse,
} from "../types/execution.types";

@Injectable()
export class ChatExecutionManager {
  private readonly logger = new Logger(ChatExecutionManager.name);

  async execute(
    payload: MessageRoutedData,
    threadMessages: ChatMessage[],
  ): Promise<LlmResponse> {
    const startTime = Date.now();

    try {
      return await this.callProvider(
        payload.selectedProvider,
        payload.selectedModel,
        threadMessages,
        startTime,
        false,
      );
    } catch (primaryError: unknown) {
      const errorMsg = primaryError instanceof Error ? primaryError.message : "Unknown error";
      this.logger.warn(
        `Primary provider ${payload.selectedProvider}/${payload.selectedModel} failed: ${errorMsg}`,
      );

      if (payload.fallbackProvider && payload.fallbackModel) {
        return this.executeFallback(
          payload.fallbackProvider,
          payload.fallbackModel,
          threadMessages,
        );
      }

      throw primaryError;
    }
  }

  private async executeFallback(
    provider: string,
    model: string,
    threadMessages: ChatMessage[],
  ): Promise<LlmResponse> {
    const startTime = Date.now();
    this.logger.log(`Attempting fallback provider ${provider}/${model}`);

    try {
      return await this.callProvider(provider, model, threadMessages, startTime, true);
    } catch (fallbackError: unknown) {
      const errorMsg = fallbackError instanceof Error ? fallbackError.message : "Unknown error";
      this.logger.error(`Fallback provider ${provider}/${model} also failed: ${errorMsg}`);
      throw new BusinessException(
        "All LLM providers failed to generate a response",
        "LLM_EXECUTION_FAILED",
      );
    }
  }

  private async callProvider(
    provider: string,
    model: string,
    threadMessages: ChatMessage[],
    startTime: number,
    usedFallback: boolean,
  ): Promise<LlmResponse> {
    if (provider === OLLAMA_PROVIDER) {
      return this.callOllama(model, threadMessages, startTime, usedFallback);
    }
    return this.callCloudProvider(provider, model, threadMessages, startTime, usedFallback);
  }

  private async callOllama(
    model: string,
    threadMessages: ChatMessage[],
    startTime: number,
    usedFallback: boolean,
  ): Promise<LlmResponse> {
    const config = AppConfig.get();
    const prompt = this.buildPromptString(threadMessages);

    const requestBody: OllamaGenerateRequest = {
      model,
      prompt,
      stream: false,
    };

    const response = await httpRequest<OllamaGenerateResponse>({
      url: `${config.OLLAMA_SERVICE_URL}/api/v1/ollama/generate`,
      method: "POST",
      body: requestBody,
      timeoutMs: 120_000,
    });

    if (!response.ok) {
      throw new BusinessException(
        `Ollama service returned status ${String(response.status)}`,
        "OLLAMA_REQUEST_FAILED",
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
      finishReason: response.data.done ? "stop" : "incomplete",
      usedFallback,
    };
  }

  private async callCloudProvider(
    provider: string,
    model: string,
    threadMessages: ChatMessage[],
    startTime: number,
    usedFallback: boolean,
  ): Promise<LlmResponse> {
    const connectorConfig = await this.fetchConnectorConfig(provider);
    const baseUrl = connectorConfig.baseUrl ?? PROVIDER_BASE_URLS[provider] ?? "";

    if (!baseUrl) {
      throw new BusinessException(
        `No base URL configured for provider ${provider}`,
        "MISSING_PROVIDER_BASE_URL",
      );
    }

    if (!connectorConfig.apiKey) {
      throw new BusinessException(
        `No API key configured for provider ${provider}`,
        "MISSING_PROVIDER_API_KEY",
      );
    }

    const messages = this.buildChatMessages(threadMessages);
    const requestBody: OpenAiChatRequest = { model, messages, stream: false };

    const response = await httpRequest<OpenAiChatResponse>({
      url: `${baseUrl}/chat/completions`,
      method: "POST",
      headers: { Authorization: `Bearer ${connectorConfig.apiKey}` },
      body: requestBody,
      timeoutMs: 120_000,
    });

    if (!response.ok) {
      throw new BusinessException(
        `Cloud provider ${provider} returned status ${String(response.status)}`,
        "CLOUD_PROVIDER_REQUEST_FAILED",
      );
    }

    const latencyMs = Date.now() - startTime;
    const firstChoice = response.data.choices[0];

    if (!firstChoice) {
      throw new BusinessException(
        `Cloud provider ${provider} returned no choices`,
        "CLOUD_PROVIDER_EMPTY_RESPONSE",
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

  private async fetchConnectorConfig(
    provider: string,
  ): Promise<ConnectorConfigResponse> {
    const config = AppConfig.get();
    const encodedProvider = encodeURIComponent(provider);
    const url = `${config.CONNECTOR_SERVICE_URL}/api/v1/internal/connectors/config?provider=${encodedProvider}`;

    const response = await httpRequest<ConnectorConfigResponse>({
      url,
      method: "GET",
      timeoutMs: 10_000,
    });

    if (!response.ok) {
      throw new BusinessException(
        `Failed to fetch connector config for provider ${provider}`,
        "CONNECTOR_CONFIG_FETCH_FAILED",
      );
    }

    return response.data;
  }

  private buildPromptString(threadMessages: ChatMessage[]): string {
    const recentMessages = threadMessages.slice(-THREAD_CONTEXT_LIMIT);

    return recentMessages
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join("\n\n");
  }

  private buildChatMessages(threadMessages: ChatMessage[]): OpenAiChatMessage[] {
    const recentMessages = threadMessages.slice(-THREAD_CONTEXT_LIMIT);

    return recentMessages.map((msg) => ({
      role: this.mapMessageRole(msg.role),
      content: msg.content,
    }));
  }

  private mapMessageRole(role: string): string {
    if (role === "USER") {
      return "user";
    }
    if (role === "ASSISTANT") {
      return "assistant";
    }
    return "system";
  }
}
