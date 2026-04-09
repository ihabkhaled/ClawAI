import { Injectable, Logger } from '@nestjs/common';
import { AppConfig } from '../../../app/config/app.config';
import { httpRequest } from '../../../common/utilities';
import { BusinessException } from '../../../common/errors';
import {
  FILE_GENERATION_PROVIDER,
  IMAGE_PROVIDER_PREFIX,
  OLLAMA_PROVIDER,
  PROVIDER_BASE_URLS,
} from '../../../common/constants';
import {
  type ConnectorConfigResponse,
  type FileGenerateResponse,
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
          payload.routingMode,
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
    routingMode?: string,
  ): Promise<LlmResponse> {
    if (provider === FILE_GENERATION_PROVIDER) {
      return this.callFileGenerationService(context, startTime, usedFallback, threadSettings);
    }
    if (provider.startsWith(IMAGE_PROVIDER_PREFIX)) {
      return this.callImageService(
        provider,
        model,
        context,
        startTime,
        usedFallback,
        context.userId,
        routingMode === 'AUTO',
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

    // Extract base64 images for Ollama's multimodal support
    const imageFiles = context.fileContents.filter((f) => f.mimeType.startsWith('image/'));
    const images = imageFiles
      .map((f) => f.content)
      .filter((c): c is string => c !== null && c.length > 0);

    const requestBody: OllamaGenerateRequest = {
      model,
      prompt,
      stream: false,
      ...(images.length > 0 ? { images } : {}),
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

    // Response content is always a string from the API (assistant messages)
    const responseContent = typeof firstChoice.message.content === 'string'
      ? firstChoice.message.content
      : '';

    return {
      content: responseContent,
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
    isAutoMode?: boolean,
  ): Promise<LlmResponse> {
    const config = AppConfig.get();
    const lastUserMsg = [...context.threadMessages].reverse().find((m) => m.role === 'USER');
    let prompt = lastUserMsg?.content ?? 'generate an image';

    // If image files are attached:
    // 1. Use vision model to analyze and build a detailed prompt
    // 2. Pass the original image as reference for image-to-image generation
    const imageFiles = context.fileContents.filter((f) => f.mimeType.startsWith('image/'));
    let referenceImageBase64: string | undefined;
    let referenceImageMimeType: string | undefined;

    if (imageFiles.length > 0) {
      prompt = await this.buildImagePromptFromVision(prompt, context);
      const firstImage = imageFiles[0];
      if (firstImage?.content) {
        referenceImageBase64 = firstImage.content;
        referenceImageMimeType = firstImage.mimeType;
      }
    }

    const response = await httpRequest<ImageGenerateResponse>({
      url: `${config.IMAGE_SERVICE_URL}/api/v1/internal/images/generate`,
      method: 'POST',
      body: {
        prompt,
        provider,
        model,
        userId,
        isAutoMode,
        referenceImageBase64,
        referenceImageMimeType,
      },
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

  private async callFileGenerationService(
    context: AssembledContext,
    startTime: number,
    usedFallback: boolean,
    threadSettings?: ThreadSettings,
  ): Promise<LlmResponse> {
    const config = AppConfig.get();
    const lastUserMsg = [...context.threadMessages].reverse().find((m) => m.role === 'USER');
    const prompt = lastUserMsg?.content ?? 'generate a file';
    const format = this.detectFileFormat(prompt);

    // Phase 1: Call LLM for content with file-generation-specific system prompt
    const contentProvider = this.pickContentProvider(context);
    const fileContext: AssembledContext = {
      ...context,
      systemPrompt: `You are a file content generator. The user wants to create a ${format} file. Generate ONLY the raw content for the file — no explanations, no markdown code blocks, no "here is your file" preamble. Output the actual content that should go inside the file. For PDF/DOCX, use markdown formatting (headers, bullets, paragraphs). For CSV, output header row + data rows. For JSON, output valid JSON. For TXT, output plain text. For HTML, output HTML. For MD, output markdown.`,
    };
    const contentResponse = await this.callCloudProvider(
      contentProvider.provider,
      contentProvider.model,
      fileContext,
      startTime,
      false,
      threadSettings,
    );

    // Phase 2: Send content to file-generation-service for conversion
    // Strip markdown code block wrappers if present
    let fileContent = contentResponse.content;
    const codeBlockMatch = /^```\w*\n([\s\S]*?)```$/m.exec(fileContent.trim());
    if (codeBlockMatch?.[1]) {
      fileContent = codeBlockMatch[1].trim();
    }

    const response = await httpRequest<FileGenerateResponse>({
      url: `${config.FILE_GENERATION_SERVICE_URL}/api/v1/internal/file-generations/generate`,
      method: 'POST',
      body: {
        prompt,
        content: fileContent,
        format,
        provider: contentResponse.provider,
        model: contentResponse.model,
        userId: context.userId,
      },
      timeoutMs: 30_000,
    });

    if (!response.ok) {
      throw new BusinessException(
        `File generation service returned status ${String(response.status)}`,
        'FILE_GENERATION_SERVICE_REQUEST_FAILED',
      );
    }

    const latencyMs = Date.now() - startTime;
    return {
      content: `Generating ${format.toLowerCase()} file\u2026`,
      provider: FILE_GENERATION_PROVIDER,
      model: 'auto',
      latencyMs,
      finishReason: 'stop',
      usedFallback,
      fileGenerationId: response.data.generationId,
    };
  }

  private detectFileFormat(prompt: string): string {
    const lower = prompt.toLowerCase();
    if (lower.includes('pdf')) {
      return 'PDF';
    }
    if (lower.includes('docx') || lower.includes('word')) {
      return 'DOCX';
    }
    if (lower.includes('csv')) {
      return 'CSV';
    }
    if (lower.includes('json')) {
      return 'JSON';
    }
    if (lower.includes('html')) {
      return 'HTML';
    }
    if (lower.includes('markdown') || lower.includes('.md')) {
      return 'MD';
    }
    return 'TXT';
  }

  private pickContentProvider(_context: AssembledContext): { provider: string; model: string } {
    // Pick first available cloud provider for content generation
    const providers = [
      { provider: 'GEMINI', model: 'gemini-2.5-flash' },
      { provider: 'ANTHROPIC', model: 'claude-sonnet-4' },
      { provider: 'OPENAI', model: 'gpt-4o-mini' },
    ];
    // For now return first; could check connector health in future
    return providers[0] ?? { provider: 'GEMINI', model: 'gemini-2.5-flash' };
  }

  private async buildImagePromptFromVision(
    userText: string,
    context: AssembledContext,
  ): Promise<string> {
    this.logger.log('Analyzing attached image with vision model before image generation');

    try {
      // Build a vision-specific context with a system prompt that extracts image details
      const visionContext: AssembledContext = {
        ...context,
        systemPrompt: `You are an image analysis expert. The user has attached an image and wants to generate a new image based on it. Your job is to:
1. Analyze the attached image in extreme detail (colors, composition, subjects, style, lighting, mood, background, objects, text, clothing, expressions, etc.)
2. Consider the user's request: "${userText}"
3. Output ONLY a detailed image generation prompt (2-4 sentences) that an AI image generator like DALL-E or Gemini Imagen can use to create a similar or modified image.
4. Do NOT explain what you're doing. Just output the prompt directly.
5. If the user asks for "similar" or "like this", describe the original image faithfully.
6. If the user asks for modifications, incorporate those changes into the prompt.
7. Include style keywords (photorealistic, digital art, cartoon, etc.) based on the original image.`,
      };

      const visionResponse = await this.callCloudProvider(
        'GEMINI',
        'gemini-2.5-flash',
        visionContext,
        Date.now(),
        false,
        undefined,
      );

      const generatedPrompt = visionResponse.content.trim();
      this.logger.log(`Vision analysis generated prompt: ${generatedPrompt.substring(0, 150)}...`);

      return generatedPrompt.length > 10 ? generatedPrompt : userText;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Vision analysis failed, using original prompt: ${msg}`);
      return userText;
    }
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
