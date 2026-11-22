import { Injectable, Logger } from '@nestjs/common';
import { assertSafeRequestUrl, declaredHost } from '@claw/shared-utilities';

import { AppConfig } from '../../../app/config/app.config';
import type { LiveModelRef } from '../../policy/types/live-policy.types';
import {
  GEMINI_DEFAULT_BASE_URL,
  MODEL_CALL_TIMEOUT_MS,
  MODEL_CONFIG_CACHE_MS,
  MODEL_CONFIG_TIMEOUT_MS,
  MODEL_CONNECTOR_CONFIG_PATH,
  OLLAMA_CONNECTOR,
  OLLAMA_DEFAULT_BASE_URL,
  OPENAI_COMPAT_STYLE,
} from '../constants/processing.constants';
import { LiveModelError } from '../errors/processing.errors';
import {
  connectorConfigSchema,
  ollamaReplySchema,
  openAiReplySchema,
} from '../schemas/processing.schemas';
import type { ConnectorConfig, ModelReply, ModelRequest } from '../types/processing.types';
import { ollamaBase, openAiCompatBase } from '../utilities/model-url.utility';

/**
 * Platform-paid model calls for summaries, translation and vision (pattern of
 * threads-service TranslationModelClient). The platform pays, so the call goes to the
 * connector's provider with the connector's key, never through a user's wallet. The
 * chain is walked in order; the first non-empty answer wins.
 */
@Injectable()
export class LiveModelClient {
  private readonly logger = new Logger(LiveModelClient.name);
  private readonly configs = new Map<string, { value: ConnectorConfig; expiresAt: number }>();

  async complete(chain: readonly LiveModelRef[], request: ModelRequest): Promise<ModelReply> {
    let lastCode = 'NO_MODEL_AVAILABLE';
    for (const ref of chain) {
      const started = Date.now();
      try {
        const content = await this.call(ref, request);
        if (content.trim() !== '') {
          return {
            content,
            connector: ref.connector,
            model: ref.model,
            latencyMs: Date.now() - started,
          };
        }
        lastCode = 'EMPTY_REPLY';
      } catch (error: unknown) {
        lastCode = error instanceof LiveModelError ? error.code : 'MODEL_CALL_FAILED';
        this.logger.warn(`live model ${ref.connector}:${ref.model} skipped: ${lastCode}`);
      }
    }
    throw new LiveModelError(lastCode);
  }

  private async call(ref: LiveModelRef, request: ModelRequest): Promise<string> {
    const config = await this.configFor(ref.connector);
    const isOpenAi = ref.style === OPENAI_COMPAT_STYLE;
    const base = isOpenAi ? openAiCompatBase(config.baseUrl) : ollamaBase(config.baseUrl);
    const url = `${base}${isOpenAi ? '/chat/completions' : '/chat'}`;
    assertSafeRequestUrl(url, declaredHost(base));
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        redirect: 'error',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${config.apiKey}` },
        body: JSON.stringify(
          isOpenAi ? this.openAiBody(ref, request) : this.ollamaBody(ref, request),
        ),
        signal: AbortSignal.timeout(MODEL_CALL_TIMEOUT_MS),
      });
    } catch {
      throw new LiveModelError('MODEL_UNREACHABLE');
    }
    if (!response.ok) throw new LiveModelError(`MODEL_HTTP_${String(response.status)}`);
    const json: unknown = await response.json().catch(() => null);
    if (isOpenAi) {
      const parsed = openAiReplySchema.safeParse(json);
      return parsed.success ? (parsed.data.choices[0]?.message.content ?? '') : '';
    }
    const parsed = ollamaReplySchema.safeParse(json);
    return parsed.success ? parsed.data.message.content : '';
  }

  private openAiBody(ref: LiveModelRef, request: ModelRequest): Record<string, unknown> {
    const userContent = request.imageJpegBase64
      ? [
          { type: 'text', text: request.user },
          {
            type: 'image_url',
            image_url: { url: `data:image/jpeg;base64,${request.imageJpegBase64}` },
          },
        ]
      : request.user;
    return {
      model: ref.model,
      stream: false,
      max_tokens: request.maxTokens,
      messages: [
        { role: 'system', content: request.system },
        { role: 'user', content: userContent },
      ],
    };
  }

  private ollamaBody(ref: LiveModelRef, request: ModelRequest): Record<string, unknown> {
    const user = request.imageJpegBase64
      ? { role: 'user', content: request.user, images: [request.imageJpegBase64] }
      : { role: 'user', content: request.user };
    return {
      model: ref.model,
      stream: false,
      think: false,
      options: { num_predict: request.maxTokens },
      messages: [{ role: 'system', content: request.system }, user],
    };
  }

  private async configFor(connector: string): Promise<ConnectorConfig> {
    const cached = this.configs.get(connector);
    if (cached && cached.expiresAt > Date.now()) return cached.value;
    const app = AppConfig.get();
    const url = `${app.CONNECTOR_SERVICE_URL}${MODEL_CONNECTOR_CONFIG_PATH}?provider=${encodeURIComponent(connector)}`;
    assertSafeRequestUrl(url, declaredHost(app.CONNECTOR_SERVICE_URL));
    let response: Response;
    try {
      response = await fetch(url, {
        redirect: 'error',
        headers: { Authorization: `Service ${app.INTER_SERVICE_AUTH_TOKEN}` },
        signal: AbortSignal.timeout(MODEL_CONFIG_TIMEOUT_MS),
      });
    } catch {
      throw new LiveModelError('CONNECTOR_UNREACHABLE');
    }
    if (!response.ok) throw new LiveModelError('CONNECTOR_NOT_CONFIGURED');
    const parsed = connectorConfigSchema.safeParse(await response.json().catch(() => null));
    if (!parsed.success) throw new LiveModelError('CONNECTOR_NOT_CONFIGURED');
    const fallbackBase =
      connector === OLLAMA_CONNECTOR ? OLLAMA_DEFAULT_BASE_URL : GEMINI_DEFAULT_BASE_URL;
    const value = { apiKey: parsed.data.apiKey, baseUrl: parsed.data.baseUrl ?? fallbackBase };
    this.configs.set(connector, { value, expiresAt: Date.now() + MODEL_CONFIG_CACHE_MS });
    return value;
  }
}
