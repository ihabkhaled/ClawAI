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
    this.logger.log(`execute: starting for message ${payload.messageId} with provider=${payload.selectedProvider} model=${payload.selectedModel}`);
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

    this.logger.debug(`execute: built candidate chain with ${String(candidates.length)} providers`);
    let lastError: unknown = null;

    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates.at(i);
      if (!candidate) {
        continue;
      }

      this.logger.debug(`execute: trying candidate ${String(i + 1)}/${String(candidates.length)} - ${candidate.provider}/${candidate.model}`);
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
    this.logger.debug(`callProvider: dispatching to provider type — provider=${provider} model=${model} usedFallback=${String(usedFallback)}`);
    if (provider === FILE_GENERATION_PROVIDER) {
      this.logger.debug('callProvider: routing to file generation service');
      return this.callFileGenerationService(context, startTime, usedFallback, threadSettings);
    }
    if (provider.startsWith(IMAGE_PROVIDER_PREFIX)) {
      this.logger.debug('callProvider: routing to image service');
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
      this.logger.debug('callProvider: routing to Ollama local provider');
      return this.callOllama(model, context, startTime, usedFallback, threadSettings);
    }
    this.logger.debug('callProvider: routing to cloud provider');
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
    this.logger.log(`callOllama: calling model=${model}`);
    const config = AppConfig.get();
    this.logger.debug('callOllama: building prompt string from context');
    const prompt = this.contextAssembly.buildPromptString(context);
    this.logger.debug(`callOllama: prompt built — length=${String(prompt.length)} chars`);

    // Extract base64 images for Ollama's multimodal support
    this.logger.debug('callOllama: extracting image files for multimodal support');
    const imageFiles = context.fileContents.filter((f) => f.mimeType.startsWith('image/'));
    const images = imageFiles
      .map((f) => f.content)
      .filter((c): c is string => c !== null && c.length > 0);
    this.logger.debug(`callOllama: found ${String(images.length)} images for multimodal input`);

    const requestBody: OllamaGenerateRequest = {
      model,
      prompt,
      stream: false,
      ...(images.length > 0 ? { images } : {}),
    };

    this.logger.debug(`callOllama: sending request to Ollama service at ${config.OLLAMA_SERVICE_URL}`);
    const response = await httpRequest<OllamaGenerateResponse>({
      url: `${config.OLLAMA_SERVICE_URL}/api/v1/ollama/generate`,
      method: 'POST',
      body: requestBody,
      timeoutMs: 120_000,
    });

    if (!response.ok) {
      this.logger.error(`callOllama: Ollama returned error status=${String(response.status)}`);
      throw new BusinessException(
        `Ollama service returned status ${String(response.status)}`,
        'OLLAMA_REQUEST_FAILED',
      );
    }

    const latencyMs = Date.now() - startTime;
    this.logger.debug(`callOllama: response received — done=${String(response.data.done)} responseLen=${String(response.data.response.length)}`);
    this.logger.log(`callOllama: completed model=${response.data.model} latencyMs=${String(latencyMs)} inputTokens=${String(response.data.promptEvalCount ?? 0)} outputTokens=${String(response.data.evalCount ?? 0)}`);

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
    this.logger.log(`callCloudProvider: calling ${provider}/${model}`);
    this.logger.debug(`callCloudProvider: resolving provider config for ${provider}`);
    const { baseUrl, apiKey } = await this.resolveProviderConfig(provider);
    this.logger.debug(`callCloudProvider: config resolved — baseUrl=${baseUrl}`);

    this.logger.debug('callCloudProvider: building chat request body');
    const requestBody = this.buildChatRequestBody(model, context, threadSettings);
    this.logger.debug(`callCloudProvider: request body built — messageCount=${String(requestBody.messages.length)} temperature=${String(requestBody.temperature ?? 'default')}`);

    this.logger.debug(`callCloudProvider: sending POST to ${baseUrl}/chat/completions`);
    const response = await httpRequest<OpenAiChatResponse>({
      url: `${baseUrl}/chat/completions`,
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: requestBody,
      timeoutMs: 120_000,
    });

    if (!response.ok) {
      this.logger.error(`callCloudProvider: ${provider} returned error status=${String(response.status)}`);
      throw new BusinessException(
        `Cloud provider ${provider} returned status ${String(response.status)}`,
        'CLOUD_PROVIDER_REQUEST_FAILED',
      );
    }

    this.logger.debug('callCloudProvider: parsing cloud response');
    const result = this.parseCloudResponse(response.data, provider, model, startTime, usedFallback);
    this.logger.log(`callCloudProvider: completed ${provider}/${model} latencyMs=${String(result.latencyMs)} inputTokens=${String(result.inputTokens ?? 0)} outputTokens=${String(result.outputTokens ?? 0)}`);
    return result;
  }

  private async resolveProviderConfig(
    provider: string,
  ): Promise<{ baseUrl: string; apiKey: string }> {
    this.logger.debug(`resolveProviderConfig: fetching connector config for ${provider}`);
    const connectorConfig = await this.fetchConnectorConfig(provider);
    this.logger.debug(`resolveProviderConfig: connector config received for ${provider}`);
    const providerBaseUrls = PROVIDER_BASE_URLS as Readonly<Record<string, string>>;
    const baseUrl = connectorConfig.baseUrl ?? providerBaseUrls[provider] ?? '';

    if (!baseUrl) {
      this.logger.error(`resolveProviderConfig: no base URL for provider ${provider}`);
      throw new BusinessException(
        `No base URL configured for provider ${provider}`,
        'MISSING_PROVIDER_BASE_URL',
      );
    }

    if (!connectorConfig.apiKey) {
      this.logger.error(`resolveProviderConfig: no API key for provider ${provider}`);
      throw new BusinessException(
        `No API key configured for provider ${provider}`,
        'MISSING_PROVIDER_API_KEY',
      );
    }

    this.logger.debug(`resolveProviderConfig: resolved baseUrl=${baseUrl} for ${provider}`);
    return { baseUrl, apiKey: connectorConfig.apiKey };
  }

  private buildChatRequestBody(
    model: string,
    context: AssembledContext,
    threadSettings?: ThreadSettings,
  ): OpenAiChatRequest {
    this.logger.debug(`buildChatRequestBody: building request for model=${model}`);
    const messages = this.contextAssembly.buildChatMessages(context);
    this.logger.debug(`buildChatRequestBody: built ${String(messages.length)} chat messages`);
    const requestBody: OpenAiChatRequest = { model, messages, stream: false };

    if (threadSettings?.temperature !== null && threadSettings?.temperature !== undefined) {
      this.logger.debug(`buildChatRequestBody: applying temperature=${String(threadSettings.temperature)}`);
      requestBody.temperature = threadSettings.temperature;
    }

    if (threadSettings?.maxTokens !== null && threadSettings?.maxTokens !== undefined) {
      this.logger.debug(`buildChatRequestBody: applying maxTokens=${String(threadSettings.maxTokens)}`);
      requestBody.max_tokens = threadSettings.maxTokens;
    }

    return requestBody;
  }

  private parseCloudResponse(
    data: OpenAiChatResponse,
    provider: string,
    model: string,
    startTime: number,
    usedFallback: boolean,
  ): LlmResponse {
    this.logger.debug(`parseCloudResponse: parsing response from ${provider}/${model}`);
    const latencyMs = Date.now() - startTime;
    const firstChoice = data.choices[0];

    if (!firstChoice) {
      this.logger.error(`parseCloudResponse: ${provider} returned no choices`);
      throw new BusinessException(
        `Cloud provider ${provider} returned no choices`,
        'CLOUD_PROVIDER_EMPTY_RESPONSE',
      );
    }

    this.logger.debug(`parseCloudResponse: finishReason=${firstChoice.finish_reason} choiceCount=${String(data.choices.length)}`);
    const responseContent =
      typeof firstChoice.message.content === 'string' ? firstChoice.message.content : '';
    this.logger.debug(`parseCloudResponse: responseContentLen=${String(responseContent.length)} inputTokens=${String(data.usage?.prompt_tokens ?? 0)} outputTokens=${String(data.usage?.completion_tokens ?? 0)}`);

    return {
      content: responseContent,
      provider,
      model,
      inputTokens: data.usage?.prompt_tokens,
      outputTokens: data.usage?.completion_tokens,
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
    this.logger.log(`callImageService: requesting image generation via ${provider}/${model}`);
    const config = AppConfig.get();
    this.logger.debug('callImageService: extracting last user message for prompt');
    const lastUserMsg = [...context.threadMessages].reverse().find((m) => m.role === 'USER');
    let prompt = lastUserMsg?.content ?? 'generate an image';
    this.logger.debug(`callImageService: base prompt length=${String(prompt.length)}`);

    // If image files are attached:
    // 1. Use vision model to analyze and build a detailed prompt
    // 2. Pass the original image as reference for image-to-image generation
    const imageFiles = context.fileContents.filter((f) => f.mimeType.startsWith('image/'));
    let referenceImageBase64: string | undefined;
    let referenceImageMimeType: string | undefined;

    if (imageFiles.length > 0) {
      this.logger.log(`callImageService: ${String(imageFiles.length)} image files attached — building vision prompt`);
      prompt = await this.buildImagePromptFromVision(prompt, context);
      this.logger.debug(`callImageService: vision prompt built — length=${String(prompt.length)}`);
      const firstImage = imageFiles[0];
      if (firstImage?.content) {
        referenceImageBase64 = firstImage.content;
        referenceImageMimeType = firstImage.mimeType;
        this.logger.debug(`callImageService: reference image attached — mimeType=${firstImage.mimeType} base64Len=${String(firstImage.content.length)}`);
        // Prepend reference instruction so the image generator knows to match the attached image
        prompt = `REFERENCE IMAGE ATTACHED — Generate an image that closely matches the visual style, composition, colors, and subject matter of the provided reference image. Use the following detailed description as guidance:\n\n${prompt}`;
      }
    } else {
      this.logger.debug('callImageService: no image files attached — using text prompt only');
    }

    this.logger.debug(`callImageService: sending request to image service at ${config.IMAGE_SERVICE_URL}`);
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
      timeoutMs: 120_000,
    });

    if (!response.ok) {
      this.logger.error(`callImageService: image service returned error status=${String(response.status)}`);
      throw new BusinessException(
        `Image service returned status ${String(response.status)}`,
        'IMAGE_SERVICE_REQUEST_FAILED',
      );
    }

    const latencyMs = Date.now() - startTime;
    this.logger.log(`callImageService: completed — generationId=${response.data.generationId} latencyMs=${String(latencyMs)}`);

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
    this.logger.log('callFileGenerationService: starting file generation');
    const config = AppConfig.get();
    this.logger.debug('callFileGenerationService: extracting last user message');
    const lastUserMsg = [...context.threadMessages].reverse().find((m) => m.role === 'USER');
    const prompt = lastUserMsg?.content ?? 'generate a file';
    this.logger.debug(`callFileGenerationService: prompt length=${String(prompt.length)}`);
    const format = this.detectFileFormat(prompt);
    this.logger.debug(`callFileGenerationService: detected format=${format}`);

    // Phase 1: Call LLM for content with file-generation-specific system prompt
    this.logger.debug('callFileGenerationService: Phase 1 — picking content provider');
    const contentProvider = this.pickContentProvider(context);
    this.logger.debug(`callFileGenerationService: content provider=${contentProvider.provider}/${contentProvider.model}`);
    const fileContext: AssembledContext = {
      ...context,
      systemPrompt: `You are a file content generator. The user wants to create a ${format} file. Generate ONLY the raw content for the file — no explanations, no markdown code blocks, no "here is your file" preamble. Output the actual content that should go inside the file. For PDF/DOCX, use markdown formatting (headers, bullets, paragraphs). For CSV, output header row + data rows. For JSON, output valid JSON. For TXT, output plain text. For HTML, output HTML. For MD, output markdown.`,
    };
    this.logger.debug('callFileGenerationService: calling cloud provider for content generation');
    const contentResponse = await this.callCloudProvider(
      contentProvider.provider,
      contentProvider.model,
      fileContext,
      startTime,
      false,
      threadSettings,
    );
    this.logger.debug(`callFileGenerationService: Phase 1 complete — contentLen=${String(contentResponse.content.length)}`);

    // Phase 2: Send content to file-generation-service for conversion
    // Strip markdown code block wrappers if present
    this.logger.debug('callFileGenerationService: Phase 2 — stripping code block wrappers if present');
    let fileContent = contentResponse.content;
    const codeBlockMatch = /^```\w*\n([\s\S]*?)```$/m.exec(fileContent.trim());
    if (codeBlockMatch?.[1]) {
      this.logger.debug('callFileGenerationService: stripped markdown code block wrapper');
      fileContent = codeBlockMatch[1].trim();
    }

    this.logger.debug(`callFileGenerationService: sending content to file-generation-service (contentLen=${String(fileContent.length)})`);
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
      this.logger.error(`callFileGenerationService: file-gen service returned error status=${String(response.status)}`);
      throw new BusinessException(
        `File generation service returned status ${String(response.status)}`,
        'FILE_GENERATION_SERVICE_REQUEST_FAILED',
      );
    }

    const latencyMs = Date.now() - startTime;
    this.logger.log(`callFileGenerationService: completed format=${format} generationId=${response.data.generationId} latencyMs=${String(latencyMs)}`);
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
    this.logger.debug('detectFileFormat: scanning prompt for format keywords');
    const lower = prompt.toLowerCase();
    if (lower.includes('pdf')) {
      this.logger.debug('detectFileFormat: matched PDF');
      return 'PDF';
    }
    if (lower.includes('docx') || lower.includes('word')) {
      this.logger.debug('detectFileFormat: matched DOCX');
      return 'DOCX';
    }
    if (lower.includes('csv')) {
      this.logger.debug('detectFileFormat: matched CSV');
      return 'CSV';
    }
    if (lower.includes('json')) {
      this.logger.debug('detectFileFormat: matched JSON');
      return 'JSON';
    }
    if (lower.includes('html')) {
      this.logger.debug('detectFileFormat: matched HTML');
      return 'HTML';
    }
    if (lower.includes('markdown') || lower.includes('.md')) {
      this.logger.debug('detectFileFormat: matched MD');
      return 'MD';
    }
    this.logger.debug('detectFileFormat: no specific format matched — defaulting to TXT');
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
        systemPrompt: `You are an expert image analyst specializing in creating precise image generation prompts. The user has attached a reference image and wants to generate a new image based on it.

Your task:
1. Study the attached image in EXTREME detail, covering ALL of the following aspects:
   - SUBJECTS: What is shown (people, animals, objects, scenes)? Describe poses, expressions, body language, clothing, accessories, hair, age, gender if applicable.
   - COMPOSITION: Layout, framing (close-up, wide shot, portrait, landscape), rule of thirds, symmetry, focal point, depth of field, camera angle (eye level, bird's eye, low angle).
   - COLORS: Dominant color palette, accent colors, color temperature (warm/cool), saturation level, color harmony (complementary, analogous, monochromatic).
   - LIGHTING: Direction (front, side, back, rim), quality (soft, hard, diffused, dramatic), time of day, shadows, highlights, ambient vs directional.
   - STYLE: Art style (photorealistic, digital art, oil painting, watercolor, anime, cartoon, 3D render, vector, pixel art, sketch, minimalist). Artistic influences or movements.
   - BACKGROUND: Setting, environment, scenery, depth, blur (bokeh), patterns, textures.
   - MOOD/ATMOSPHERE: Emotional tone, ambiance (serene, dramatic, whimsical, dark, vibrant, nostalgic, futuristic).
   - TEXTURES/MATERIALS: Surface qualities (glossy, matte, rough, smooth, metallic, fabric, organic).
   - TEXT/TYPOGRAPHY: Any text visible, font style, placement.

2. Consider the user's request: "${userText}"
   - If they want "similar", "like this", "recreate", describe the original faithfully and completely.
   - If they want modifications, incorporate those specific changes while keeping unmentioned aspects the same.

3. Output ONLY a single detailed image generation prompt (4-8 sentences). Format it as a direct description that an AI image generator will understand. Start with the main subject, then style, then details.

4. CRITICAL RULES:
   - Do NOT say "I see" or "The image shows" — write it as a generation instruction.
   - Do NOT add explanations, preambles, or commentary.
   - Start directly with the subject description (e.g., "A young woman with..." or "A serene mountain landscape...").
   - End with style and quality keywords (e.g., "photorealistic, highly detailed, 8K, professional photography" or "digital art, vibrant colors, trending on ArtStation").
   - Be SPECIFIC — say "warm golden sunset light" not just "nice lighting".
   - Include aspect ratio cues if the original has a distinctive shape.`,
      };

      const visionResponse = await this.callCloudProvider(
        'GEMINI',
        'gemini-2.5-flash',
        visionContext,
        Date.now(),
        false,
      );

      const generatedPrompt = visionResponse.content.trim();
      this.logger.log(`Vision analysis generated prompt: ${generatedPrompt.slice(0, 200)}...`);

      return generatedPrompt.length > 10 ? generatedPrompt : userText;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Vision analysis failed, using original prompt: ${msg}`);
      return userText;
    }
  }

  private async fetchConnectorConfig(provider: string): Promise<ConnectorConfigResponse> {
    this.logger.debug(`fetchConnectorConfig: fetching config for provider=${provider}`);
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
